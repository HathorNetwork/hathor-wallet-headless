/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  SendTransaction,
  PartialTxProposal,
  helpersUtils,
  PartialTxInputData,
  PartialTx,
  txApi,
  storage,
  constants: { HATHOR_TOKEN_CONFIG },
} = require('@hathor/wallet-lib');
const { assembleTransaction } = require('../../../services/atomic-swap.service');
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

  const inputs = req.body.inputs || [];
  const outputs = req.body.outputs || [];
  const sendTokens = req.body.send_tokens || [];
  const receiveTokens = req.body.receive_tokens || [];
  const changeAddress = req.body.change_address || null;
  const partialTx = req.body.partial_tx || null;
  let markAsSelected = true;
  if (req.body.lock !== undefined) {
    markAsSelected = req.body.lock;
  }

  if (inputs.length === 0
    && outputs.length === 0
    && sendTokens.length === 0
    && receiveTokens.length === 0
  ) {
    res.status(400).json({ success: false, error: 'Should have at least one operation' });
    return;
  }

  const proposal = partialTx
    ? PartialTxProposal.fromPartialTx(partialTx, network) : new PartialTxProposal(network);

  for (const input of inputs) {
    try {
      const txData = await new Promise((resolve, reject) => {
        txApi.getTransaction(input.txId, data => resolve(data))
          .catch(err => reject(err));
      });

      if (!txData.success) {
        throw new Error(`Utxo for transaction ${input.txId} and input ${input.index} not found`);
      }

      const txout = txData.tx.outputs[input.index];
      proposal.addInput(
        req.wallet,
        txout.txId,
        txout.index,
        txout.value,
        txout.decoded.address,
        {
          markAsSelected,
          token_data: txout.token_data,
          token: txout.token,
        },
      );
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
  }

  for (const send of sendTokens) {
    const token = send.token || HATHOR_TOKEN_CONFIG.uid;
    proposal.addSend(req.wallet, token, send.value, { changeAddress, markAsSelected });
  }

  for (const output of outputs) {
    const token = output.token || HATHOR_TOKEN_CONFIG.uid;
    proposal.addOutput(token, output.value, output.address);
  }

  for (const receive of receiveTokens) {
    const token = receive.token || HATHOR_TOKEN_CONFIG.uid;
    const timelock = receive.timelock || null;
    const address = receive.address || null;
    proposal.addReceive(
      req.wallet,
      token,
      receive.value,
      { timelock, address }
    );
  }

  res.send({
    success: true,
    data: proposal.partialTx.serialize(),
    isComplete: proposal.partialTx.isComplete(),
  });
}

async function getMySignatures(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const network = req.wallet.getNetworkObject();
  const partialTx = req.body.partial_tx;

  storage.setStore(req.wallet.store);
  try {
    const proposal = PartialTxProposal.fromPartialTx(partialTx, network);
    // TODO remove this when we create a method to sign inputs in the wallet facade
    await proposal.signData('123');
    res.send({
      success: true,
      signatures: proposal.signatures.serialize(),
      isComplete: proposal.signatures.isComplete(),
    });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function signTx(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const network = req.wallet.getNetworkObject();

  const partialTx = req.body.partial_tx;
  const signatures = req.body.signatures || [];

  storage.setStore(req.wallet.store);
  try {
    const tx = assembleTransaction(partialTx, signatures, network);

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

  const network = req.wallet.getNetworkObject();

  const partialTx = req.body.partial_tx;
  const sigs = req.body.signatures || [];

  storage.setStore(req.wallet.store);
  try {
    const transaction = assembleTransaction(partialTx, sigs, network);

    const sendTransaction = new SendTransaction({ transaction, network });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function getInputData(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const network = req.wallet.getNetworkObject();
  const { txHex } = req.body;

  try {
    const tx = helpersUtils.createTxFromHex(txHex, network);
    const signatures = new PartialTxInputData(tx.getDataToSign().toString('hex'), tx.inputs.length);

    for (const [index, input] of tx.inputs.entries()) {
      if ((!input.data) || input.data.length === 0) {
        // input without data to be added
        continue;
      }

      signatures.addData(index, input.data);
    }

    res.send({ success: true, signatures: signatures.serialize() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function getLockedUTXOs(req, res) {
  try {
    const utxos = [];
    const historyTransactions = req.wallet.getFullHistory();
    for (const tx of Object.values(historyTransactions)) {
      const marked = [];
      for (const [index, output] of tx.outputs.entries()) {
        if (output.selected_as_input === true) {
          marked.push(index);
        }
      }
      if (marked.length !== 0) {
        utxos.push({
          tx_id: tx.tx_id,
          outputs: marked,
        });
      }
    }

    res.send({ success: true, locked_utxos: utxos });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function unlockInputs(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({ success: false, error: 'Cannot run this method while a transaction is being sent.' });
    return;
  }

  const partialTx = req.body.partial_tx;

  try {
    const partial = PartialTx.deserialize(partialTx, req.wallet.getNetworkObject());
    const tx = partial.getTx();

    for (const input of tx.inputs) {
      req.wallet.markUtxoSelected(input.hash, input.index, false);
    }

    res.send({ success: true });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

module.exports = {
  buildTxProposal,
  getInputData,
  getLockedUTXOs,
  getMySignatures,
  signAndPush,
  signTx,
  unlockInputs,
};
