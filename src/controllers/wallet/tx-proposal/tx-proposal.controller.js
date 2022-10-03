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
  transaction,
  helpers,
} = require('@hathor/wallet-lib');
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
  const network = req.wallet.getNetworkObject();
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
    const sendTransaction = SendTransaction({
      outputs,
      inputs,
      changeAddress,
      pin: '123',
      network,
    });
    sendTransaction.prepareTxData();
    // Do not sign or complete the transaction yet
    const preparedData = transaction.prepareData(
      sendTransaction.fullTxData, '123',
      { getSignature: false, completeTx: false },
    );
    const tx = helpers.createTxFromData(preparedData, network);

    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function addSignatures(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex, signatures } = req.body;

  const tx = helpersUtils.createTxFromHex(txHex, req.wallet.network);

  for (const [index, inputData] of Object.entries(signatures)) {
    tx.inputs[index].setData(Buffer.from(inputData, 'hex'));
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
  const transaction = helpersUtils.createTxFromHex(txHex, req.wallet.network);

  try {
    const sendTransaction = new SendTransaction({ transaction, network });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, tx: mapTxReturn(response)})
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

module.exports = {
  buildTxProposal,
  addSignatures,
  pushTxHex,
};
