/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { constants: { HATHOR_TOKEN_CONFIG }, default: hathorLib, transactionUtils } = require('@hathor/wallet-lib');
const { Request, Response } = require('express');

const settings = require('../../settings');
const {
  initializedWallets,
  startWallet,
  isHsmWallet,
} = require('../../services/wallets.service');
const { parametersValidation } = require('../../helpers/validations.helper');
const { API_ERROR_CODES } = require('../../helpers/constants');
const hsmService = require('../../services/hsm.service');
const { HsmError } = require('../../errors');
const { getReadonlyWalletConfig } = require('../../helpers/wallet.helper');
const { cantSendTxErrorMessage } = require('../../helpers/constants');
const { lock, lockTypes } = require('../../lock');
const { mapTxReturn } = require('../../helpers/tx.helper');

/**
 * Starts a read-only wallet integrated with the HSM.
 * The process is similar to the one on the `/start` endpoint.
 * @see src/controllers/index.controller.js , start function
 */
async function startHsmWallet(req, res) {
  // Retrieving parameters from request body
  const walletId = req.body['wallet-id'];
  const hsmKeyName = req.body['hsm-key'];

  // Validates input wallet-id
  if (!walletId) {
    res.send({
      success: false,
      message: 'Parameter \'wallet-id\' is required.',
    });
    return;
  }
  if (initializedWallets.has(walletId)) {
    // We already have a wallet for this key
    // so we log that it won't start a new one because
    // it must first stop the old wallet and then start the new
    console.error('Error starting wallet because this wallet-id is already in use. You must stop the wallet first.');
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletId}`,
      errorCode: API_ERROR_CODES.WALLET_ALREADY_STARTED,
    });
    return;
  }

  // Validates input hsm-key
  if (!hsmKeyName) {
    res.send({
      success: false,
      message: 'Parameter \'hsm-key\' is required.',
    });
    return;
  }

  // Connects to the HSM
  /**
   * @type {hsm.interfaces.Hsm}
   */
  let connectionObj;
  try {
    connectionObj = await hsmService.hsmConnect();
  } catch (e) {
    const responseObj = {
      success: false,
      message: `Unexpected error on HSM connection: ${e.message}`,
    };

    // If this is a HsmError, the error message was already treated
    // and there should be no attempt to disconnect from the HSM,
    // since it's still being used by another request.
    if (e instanceof HsmError) {
      responseObj.message = e.message;
      res.send(responseObj);
      return;
    }

    // Send error message and disconnect from the HSM
    res.send(responseObj);
    await hsmService.hsmDisconnect();
    return;
  }

  // Validates if the requested key is a valid BIP32 xPriv on the HSM
  const validationObj = await hsmService.isKeyValidXpriv(connectionObj, hsmKeyName);
  if (!validationObj.isValidXpriv) {
    res.send({
      success: false,
      message: validationObj.reason,
    });
    await hsmService.hsmDisconnect();
    return;
  }

  // Obtains this wallet's xPub from the HSM
  let xPub = null;
  try {
    xPub = await hsmService.getXPubFromKey(connectionObj, hsmKeyName, {
      isReadOnlyWallet: true,
    });
  } catch (e) {
    res.send({
      success: false,
      message: `Unexpected error on HSM xPub derivation: ${e.message}`,
    });
    await hsmService.hsmDisconnect();
    return;
  }
  await hsmService.hsmDisconnect();

  // Builds the wallet configuration object
  const walletConfig = getReadonlyWalletConfig({ xpub: xPub });

  // Create the wallet instance
  const config = settings.getConfig();

  try {
    await startWallet(walletId, walletConfig, config, { hsmKeyName });
    res.send({ success: true });
  } catch (error) {
    console.error(`Error starting HSM wallet: ${error.message}`);
    res.status(500).send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletId} and key ${hsmKeyName}`,
    });
  }
}

/**
 * Send a single output transaction (plus change if needed)
 *
 * @param {Request} req
 * @param {Response} res
 */
async function simpleSendTx(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  if (!isHsmWallet(req.headers['x-wallet-id'])) {
    res.status(400).json({ success: false, message: 'This endpoint can only be used with an HSM wallet' });
    return;
  }

  /**
   * Define types not included in express Request
   * @type {{ wallet: hathorLib.HathorWallet, hsmKeyName: string }}
   */
  const { wallet, hsmKeyName } = req;

  const walletType = await wallet.storage.getWalletType();
  if (walletType !== hathorLib.WalletType.P2PKH) {
    res.status(400).json({ success: false, message: 'This endpoint can only be used with a P2PKH wallet' });
    return;
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { address, value, token } = req.body;
  const tokenId = token || HATHOR_TOKEN_CONFIG.uid;
  const changeAddress = req.body.change_address || null;

  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }

    const outputs = [{ address, value, token: tokenId }];

    const sendTransaction1 = new hathorLib.SendTransaction({
      storage: wallet.storage,
      outputs,
      inputs: [],
      changeAddress,
    });

    console.log('Preparing transaction');

    const txData = await sendTransaction1.prepareTxData();
    console.log(`Transaction prepared: ${JSON.stringify(txData, null, 2)}`);
    const tx = transactionUtils.createTransactionFromData(txData, wallet.getNetworkObject());
    console.log('Transaction model created');
    tx.validate();
    console.log('Transaction model validated');
    // create connection
    const conn = await hsmService.hsmConnect();
    console.log('Connection to HSM established');
    await hsmService.signTxP2PKH(conn, wallet, tx, hsmKeyName);
    console.log('Transaction signed');
    tx.prepareToSend();
    console.log('Transaction ready to send');

    // Now that we have a signed transaction we can send using the SendTransaction facade again
    const sendTransaction = new hathorLib.SendTransaction({
      storage: wallet.storage,
      transaction: tx,
    });
    console.log('Transaction ready to mine');
    // This will mine and push the transaction
    await sendTransaction.runFromMining();

    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    console.error(err);
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

/**
 * Send a single output transaction (plus change if needed)
 *
 * @param {Request} req
 * @param {Response} res
 */
async function proposeSimpleTx(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  if (!isHsmWallet(req.headers['x-wallet-id'])) {
    res.status(400).json({ success: false, message: 'This endpoint can only be used with an HSM wallet' });
    return;
  }

  /**
   * Define types not included in express Request
   * @type {{ wallet: hathorLib.HathorWallet, hsmKeyName: string }}
   */
  const { wallet } = req;

  const walletType = await wallet.storage.getWalletType();
  if (walletType !== hathorLib.WalletType.P2PKH) {
    res.status(400).json({ success: false, message: 'This endpoint can only be used with a P2PKH wallet' });
    return;
  }

  const { address, value, token } = req.body;
  const tokenId = token || HATHOR_TOKEN_CONFIG.uid;
  const changeAddress = req.body.change_address || null;

  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }

    const outputs = [{ address, value, token: tokenId }];

    const sendTransaction1 = new hathorLib.SendTransaction({
      storage: wallet.storage,
      outputs,
      inputs: [],
      changeAddress,
    });

    const txData = await sendTransaction1.prepareTxData();
    const tx = transactionUtils.createTransactionFromData(txData, wallet.getNetworkObject());
    tx.validate();

    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    console.error(err);
    res.send({ success: false, error: err.message });
  }
}

module.exports = {
  startHsmWallet,
  simpleSendTx,
  proposeSimpleTx,
};
