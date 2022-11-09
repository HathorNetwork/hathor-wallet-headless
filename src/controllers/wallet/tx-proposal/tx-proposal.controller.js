/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  constants: hathorLibConstants,
  helpersUtils,
  SendTransaction,
  transaction: transactionUtils,
  walletUtils,
  storage,
} = require('@hathor/wallet-lib');
const { _ } = require('lodash');
const { parametersValidation } = require('../../../helpers/validations.helper');
const { lock, lockTypes } = require('../../../lock');
const { cantSendTxErrorMessage } = require('../../../helpers/constants');
const { mapTxReturn, getUtxosToFillTx } = require('../../../helpers/tx.helper');

async function buildTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  // build a transaction hex
  const { wallet } = req;
  const network = wallet.getNetworkObject();
  const { outputs } = req.body;

  const tokens = new Map();
  for (const output of outputs) {
    if (!output.token) {
      output.token = hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;
    }
    if (!tokens.has(output.token)) {
      tokens.set(output.token, { tokenUid: output.token, amount: 0 });
    }
    if (output.type === 'data') {
      // The data output requires that the user burns 0.01 HTR
      // this must be set here, in order to make the filter_address query
      // work if the inputs are selected by this method
      output.value = 1;
    }
    const sumObject = tokens.get(output.token);
    sumObject.amount += output.value;
  }

  // Expects array of objects with {'txId', 'index'}
  let inputs = req.body.inputs || [];
  const changeAddress = req.body.change_address || null;

  if (inputs.length > 0) {
    if (inputs[0].type === 'query') {
      const query = inputs[0];
      inputs = [];

      // query processing

      for (const element of tokens) {
        const [tokenUid, tokenObj] = element;
        const queryOptions = {
          ...query,
          token: tokenUid,
        };
        const utxos = getUtxosToFillTx(wallet, tokenObj.amount, queryOptions);
        if (!utxos) {
          const response = {
            success: false,
            error: 'No utxos available for the query filter for this amount.',
            token: tokenUid
          };
          res.send(response);
          lock.unlock(lockTypes.SEND_TX);
          return;
        }

        for (const utxo of utxos) {
          inputs.push({ txId: utxo.tx_id, index: utxo.index });
        }
      }
    } else {
      // The new lib version expects input to have tx_id and not hash
      inputs = inputs.map(input => ({ txId: input.hash, index: input.index }));
    }
  }

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

async function pushTxHex(req, res) {
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

  const network = req.wallet.getNetworkObject();
  const { txHex } = req.body;

  try {
    const tx = helpersUtils.createTxFromHex(txHex, req.wallet.getNetworkObject());
    const sendTransaction = new SendTransaction({ transaction: tx, network });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, tx: mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
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
  pushTxHex,
  getWalletInputs,
  getInputData,
};
