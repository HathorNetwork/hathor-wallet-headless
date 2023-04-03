/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  helpersUtils,
  SendTransaction,
  transaction: transactionUtils,
  walletUtils,
  storage,
} = require('@hathor/wallet-lib');
const { _ } = require('lodash');
const { prepareTxFunds } = require('../../../helpers/tx.helper');
const { parametersValidation } = require('../../../helpers/validations.helper');

async function buildTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  // build a transaction hex
  const { wallet } = req;

  const preparedFundsResponse = prepareTxFunds(
    wallet,
    req.body.outputs,
    req.body.inputs || [],
  );
  if (!preparedFundsResponse.success) {
    res.send(preparedFundsResponse);
    return;
  }
  const { inputs, outputs } = preparedFundsResponse;
  const changeAddress = req.body.change_address || null;
  const network = wallet.getNetworkObject();

  try {
    const sendTransaction = new SendTransaction({
      outputs,
      inputs,
      changeAddress,
      pin: '123',
      network,
    });
    const fullTxData = sendTransaction.prepareTxData();
    // Do not sign or complete the transaction yet
    const preparedData = transactionUtils.prepareData(
      fullTxData,
      '123',
      { getSignature: false },
    );
    const tx = helpersUtils.createTxFromData(preparedData, network);
    res.send({ success: true, txHex: tx.toHex(), dataToSignHash: tx.getDataToSignHash().toString('hex') });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function addSignatures(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex, signatures } = req.body;
  const tx = helpersUtils.createTxFromHex(txHex, req.wallet.getNetworkObject());

  for (const signature of signatures) {
    tx.inputs[signature.index].setData(Buffer.from(signature.data, 'hex'));
  }

  res.send({ success: true, txHex: tx.toHex() });
}

/**
 * Get metadata on all inputs from the loaded wallet.
 */
function getWalletInputs(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex } = req.query;
  const { wallet } = req;

  try {
    const network = wallet.getNetworkObject();
    const tx = helpersUtils.createTxFromHex(txHex, network);
    res.send({ success: true, inputs: wallet.getWalletInputInfo(tx) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

function getInputData(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { index, type } = req.body;
  storage.setStore(req.wallet.store);
  const accessData = storage.getItem('wallet:accessData');
  let inputData;

  if (type === 'p2pkh') {
    const { signature } = req.body;
    inputData = transactionUtils.createInputData(
      Buffer.from(signature, 'hex'),
      walletUtils.getPublicKeyFromXpub(accessData.xpubkey, index).toBuffer(),
    );
  } else if (type === 'p2sh') {
    // check if the loaded wallet is MultiSig
    const multisigData = accessData.multisig;
    if (!multisigData) {
      res.send({ success: false, error: 'wallet is not MultiSig' });
      return;
    }
    const { signatures } = req.body;

    // Validate that every xpub is from our configured xpubs
    if (!Object.keys(signatures).every(xpub => multisigData.pubkeys.includes(xpub))) {
      res.send({ success: false, error: 'signature from unknown signer' });
      return;
    }

    // Get signatures as buffer sorted by the signer's pubkey (as hex string)
    const sortedSigs = _.sortBy(
      Object.entries(signatures).map(v => ({
        // The xpub should the same as the one on the multisig configuration, i.e. account path xpub
        pubkey: walletUtils.getPublicKeyFromXpub(v[0]).toString(),
        signature: Buffer.from(v[1], 'hex'),
      })),
      val => val.pubkey,
    ).map(val => val.signature);

    const redeemScript = walletUtils.createP2SHRedeemScript(
      multisigData.pubkeys,
      multisigData.numSignatures,
      index,
    );
    inputData = walletUtils.getP2SHInputData(sortedSigs, redeemScript);
  } else {
    // XXX: Should not happen due to validation
    res.status(400).json({ success: false });
    return;
  }

  res.send({ success: true, inputData: inputData.toString('hex') });
}

module.exports = {
  buildTxProposal,
  addSignatures,
  getWalletInputs,
  getInputData,
};
