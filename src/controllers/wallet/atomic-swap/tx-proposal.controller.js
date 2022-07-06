/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  wallet: walletLib,
  SendTransaction,
  PartialTxProposal,
  helpersUtils,
  PartialTxInputData,
  PartialTx,
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

  const inputs = req.body.inputs || [];
  const outputs = req.body.outputs || [];
  const sendTokens = req.body.send_tokens || [];
  const receiveTokens = req.body.receive_tokens || [];
  const changeAddress = req.body.change_address || null;
  const partialTx = req.body.partial_tx || null;
  const markAsSelected = req.body.lock || true;

  if (inputs.length === 0
    && outputs.length === 0
    && sendTokens.length === 0
    && receiveTokens.length === 0
  ) {
    res.status(400).json({ success: false, error: ['Should have at least one operation'] });
    return;
  }

  const proposal = partialTx
    ? PartialTxProposal.fromPartialTx(partialTx, network) : new PartialTxProposal(network);

  for (const input of inputs) {
    proposal.addInput(
      input.txId,
      input.index,
      input.value,
      { token: input.token, markAsSelected },
    );
  }

  for (const send of sendTokens) {
    proposal.addSend(send.token, send.value, { changeAddress, markAsSelected });
  }

  for (const output of outputs) {
    proposal.addOutput(output.token, output.value, output.address);
  }

  for (const receive of receiveTokens) {
    proposal.addReceive(
      receive.token,
      receive.value,
      { timelock: receive.timelock, address: receive.address }
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
  const proposal = PartialTxProposal.fromPartialTx(partialTx, network);

  try {
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

  const proposal = PartialTxProposal.fromPartialTx(partialTx, network);

  try {
    await proposal.signData('123');
    for (const signature of signatures) {
      proposal.signatures.addSignatures(signature);
    }
    if (!proposal.isComplete()) {
      throw new Error('Transaction is not complete');
    }
    const tx = proposal.prepareTx();
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
  const signatures = req.body.signatures || [];

  const proposal = PartialTxProposal.fromPartialTx(partialTx, network);

  try {
    await proposal.signData('123');
    for (const signature of signatures) {
      proposal.signatures.addSignatures(signature);
    }
    if (!proposal.isComplete()) {
      throw new Error('Transaction is not complete');
    }
    const tx = proposal.prepareTx();

    const sendTransaction = new SendTransaction({ transaction: tx, network });
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
    const signatures = new PartialTxInputData(tx.getDataToSign(), tx.inputs.length);

    for (const [index, input] of tx.inputs.entries()) {
      if (input.data === null || input.data.length === 0) {
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

  const partialTx = req.body.partial_tx;
  const historyTransactions = req.wallet.getFullHistory();

  try {
    const partial = PartialTx.deserialize(partialTx, req.wallet.getNetworkObject());
    const tx = partial.getTx();

    for (const input of tx.inputs) {
      // Check that it exists in history
      if (historyTransactions[input.hash] && historyTransactions[input.hash].outputs[input.index]) {
        // unlock in history
        historyTransactions[input.hash].outputs[input.index].selected_as_input = false;
      }
    }
    // save historyTransactions
    // XXX: This should be ok since we use getFullHistory which sets the store to this wallet
    //      We do not change the history, only the 'selected_as_input' of some UTXOs
    //      so no other change is needed (e.g. allTokens)
    const data = walletLib.getWalletData();
    data.historyTransactions = historyTransactions;
    walletLib.setWalletData(data);

    res.send({ success: true });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

module.exports = {
  buildTxProposal,
  getMySignatures,
  signTx,
  signAndPush,
  getInputData,
  getLockedUTXOs,
  unlockInputs,
};
