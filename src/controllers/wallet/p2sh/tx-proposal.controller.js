/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  constants: hathorLibConstants,
  SendTransaction,
  transactionUtils,
  constants,
} = require('@hathor/wallet-lib');
const { parametersValidation } = require('../../../helpers/validations.helper');
const { lock, lockTypes } = require('../../../lock');
const { cantSendTxErrorMessage } = require('../../../helpers/constants');
const { mapTxReturn } = require('../../../helpers/tx.helper');

async function buildTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const network = req.wallet.getNetworkObject();
  const { outputs } = req.body;
  const inputs = req.body.inputs || [];
  const changeAddress = req.body.change_address || null;

  if (changeAddress && !await req.wallet.isAddressMine(changeAddress)) {
    res.send({ success: false, error: 'Change address does not belong to the loaded wallet.' });
    return;
  }

  for (const output of outputs) {
    if (!output.token) {
      output.token = hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;
    }
  }
  try {
    const sendTransaction = new SendTransaction({
      storage: req.wallet.storage,
      outputs,
      inputs,
      changeAddress,
    });
    const txData = await sendTransaction.prepareTxData();
    txData.version = constants.DEFAULT_TX_VERSION;
    const tx = transactionUtils.createTransactionFromData(txData, network);

    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    console.error(err);
    res.send({ success: false, error: err.message });
  }
}

async function buildCreateTokenTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const {
    name,
    symbol,
    amount,
  } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const createMint = req.body.create_mint ?? true;
  const mintAuthorityAddress = req.body.mint_authority_address || null;
  const allowExternalMintAuthorityAddress = req.body.allow_external_mint_authority_address || null;
  const createMelt = req.body.create_melt ?? true;
  const meltAuthorityAddress = req.body.melt_authority_address || null;
  const allowExternalMeltAuthorityAddress = req.body.allow_external_melt_authority_address || null;

  try {
    const createTokenTransaction = await req.wallet.prepareCreateNewToken(name, symbol, amount, {
      address,
      changeAddress,
      createMint,
      mintAuthorityAddress,
      allowExternalMintAuthorityAddress,
      createMelt,
      meltAuthorityAddress,
      allowExternalMeltAuthorityAddress,
    });
    res.send({ success: true, txHex: createTokenTransaction.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function getMySignatures(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex } = req.body;
  try {
    const sigs = await req.wallet.getAllSignatures(txHex, '123');
    res.send({ success: true, signatures: sigs });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

/**
 * Method to create a Transaction instance from the tx in hex format and
 * an array of P2SH signatures.
 *
 * @param {HathorWallet} wallet The wallet object
 * @param {string} txHex The transaction in hex format
 * @param {Array[string]} signatures the serialized P2SHSignatures of this transaction
 * @returns {Promise<Transaction>}
 */
async function assemblePartialTransaction(wallet, txHex, signatures) {
  const multisigData = await wallet.getMultisigData();
  if (signatures.length !== multisigData.numSignatures) {
    throw new Error(
      `Quantity of signatures different than expected. \
Expected ${multisigData.numSignatures} Received ${signatures.length}`
    );
  }
  const tx = await wallet.assemblePartialTransaction(txHex, signatures);
  tx.prepareToSend();
  return tx;
}

async function signTx(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex } = req.body;
  const signatures = req.body.signatures || [];
  try {
    const tx = await assemblePartialTransaction(req.wallet, txHex, signatures);
    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function signAndPush(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { txHex } = req.body;
  const signatures = req.body.signatures || [];
  try {
    const tx = await assemblePartialTransaction(req.wallet, txHex, signatures);

    const sendTransaction = new SendTransaction({
      storage: req.wallet.storage,
      transaction: tx,
    });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

module.exports = {
  buildTxProposal,
  buildCreateTokenTxProposal,
  getMySignatures,
  signTx,
  signAndPush,
};
