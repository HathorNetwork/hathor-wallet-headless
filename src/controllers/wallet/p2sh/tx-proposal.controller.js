/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  constants: hathorLibConstants,
  SendTransaction,
  helpersUtils,
  storage,
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

  for (const output of outputs) {
    if (!output.token) {
      output.token = hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;
    }
  }
  try {
    // XXX: This is a temporary fix until the wallet-lib solves this storage issue
    storage.setStore(req.wallet.store);
    const sendTransaction = new SendTransaction({ outputs, inputs, changeAddress, network });
    const tx = helpersUtils.createTxFromData(
      { version: 1, ...sendTransaction.prepareTxData() },
      network
    );

    res.send({ success: true, txHex: tx.toHex() });
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
    const sigs = req.wallet.getAllSignatures(txHex, '123');
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
 * @returns {Transaction}
 */
function assemblePartialTransaction(wallet, txHex, signatures) {
  if (!wallet.multisig) {
    // This wallet is not a MultiSig wallet
    throw new Error('Invalid wallet for this operation.');
  }
  if (signatures.length !== wallet.multisig.numSignatures) {
    throw new Error(
      `Quantity of signatures different than expected. \
Expected ${wallet.multisig.numSignatures} Received ${signatures.length}`
    );
  }
  const tx = wallet.assemblePartialTransaction(txHex, signatures);
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
    const tx = assemblePartialTransaction(req.wallet, txHex, signatures);
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
    const tx = assemblePartialTransaction(req.wallet, txHex, signatures);

    const sendTransaction = new SendTransaction({
      transaction: tx,
      network: req.wallet.getNetworkObject(),
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
  getMySignatures,
  signTx,
  signAndPush,
};
