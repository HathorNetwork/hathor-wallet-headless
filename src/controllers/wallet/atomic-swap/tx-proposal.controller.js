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
  constants: { HATHOR_TOKEN_CONFIG, HATHOR_BIP44_CODE },
  wallet: oldWallet,
  dateFormatter,
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

  const sendTokens = req.body.send || { tokens: [] };
  const receiveTokens = req.body.receive || { tokens: [] };
  const changeAddress = req.body.change_address || null;
  const partialTx = req.body.partial_tx || null;
  let markAsSelected = true;
  if (req.body.lock !== undefined) {
    markAsSelected = req.body.lock;
  }
  const utxos = [];

  if (sendTokens.tokens.length === 0 && receiveTokens.tokens.length === 0) {
    res.status(400).json({ success: false, error: 'Should have at least one operation' });
    return;
  }

  const proposal = partialTx
    ? PartialTxProposal.fromPartialTx(partialTx, network) : new PartialTxProposal(network);

  if (sendTokens.utxos && sendTokens.utxos.length > 0) {
    try {
      const currentTs = dateFormatter.dateToTimestamp(new Date());
      for (const utxo of sendTokens.utxos) {
        const txData = await new Promise((resolve, reject) => {
          txApi.getTransaction(utxo.txId, data => resolve(data))
            .catch(err => reject(err));
        });

        if (!txData.success) {
          throw new Error(`Utxo for transaction ${utxo.txId} and index ${utxo.index} not found`);
        }

        let heightLocked = false;
        if (txData.tx.height) {
          const blocksMined = (oldWallet.getNetworkHeight() - txData.tx.height);
          heightLocked = blocksMined < oldWallet.getRewardLockConstant();
          if (heightLocked) {
            throw new Error(`Utxo for transaction ${utxo.txId} and index ${utxo.index} is a block reward and require ${oldWallet.getRewardLockConstant() - blocksMined} more block(s) to be mined before it can be spent.`);
          }
        }

        const txout = txData.tx.outputs[utxo.index];

        const addressPath = `m/44'/${HATHOR_BIP44_CODE}'/0'/0/${req.wallet.getAddressIndex(txout.decoded.address)}`;
        const authorities = oldWallet.isAuthorityOutput(txout) ? txout.value : 0;
        const timeLocked = txout.decoded.timelock ? txout.decoded.timelock > currentTs : false;

        if (timeLocked) {
          throw new Error(`Utxo for transaction ${utxo.txId} and index ${utxo.index} is locked until ${dateFormatter.parseTimestamp(txout.decoded.timelock)}`);
        }

        const locked = timeLocked || heightLocked;

        utxos.push({
          txId: utxo.txId,
          index: utxo.index,
          tokenId: txout.token,
          value: txout.value,
          address: txout.decoded.address,
          timelock: txout.decoded.timelock,
          authorities,
          locked,
          addressPath,
          heightlock: null,
          tokenData: txout.token_data,
        });
      }
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
  }

  for (const send of sendTokens.tokens) {
    const token = send.token || HATHOR_TOKEN_CONFIG.uid;
    proposal.addSend(req.wallet, token, send.value, { utxos, changeAddress, markAsSelected });
  }

  for (const receive of receiveTokens.tokens) {
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

  // TODO remove this when we create a method to sign inputs in the wallet facade
  storage.setStore(req.wallet.store);
  try {
    const proposal = PartialTxProposal.fromPartialTx(partialTx, network);
    await proposal.signData('123');
    res.send({
      success: true,
      signatures: proposal.signatures.serialize(),
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

  // TODO remove this when we create a method to sign inputs in the wallet facade
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

  // TODO remove this when we create a method to sign inputs in the wallet facade
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
