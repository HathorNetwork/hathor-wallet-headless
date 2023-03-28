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
  storage,
  constants: { HATHOR_TOKEN_CONFIG, TOKEN_MINT_MASK, TOKEN_MELT_MASK },
  wallet: oldWallet,
} = require('@hathor/wallet-lib');
const atomicSwapService = require('../../../services/atomic-swap.service');
const { parametersValidation } = require('../../../helpers/validations.helper');
const { lock, lockTypes } = require('../../../lock');
const { cantSendTxErrorMessage } = require('../../../helpers/constants');
const { mapTxReturn } = require('../../../helpers/tx.helper');
const constants = require('../../../constants');

/**
 * Build or update a partial transaction proposal.
 */
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
  /** @type {{password: string, is_new?: boolean, proposal_id?: string}} */
  const serviceParams = req.body.service || {};

  const utxos = [];

  if (sendTokens.tokens.length === 0 && receiveTokens.tokens.length === 0) {
    res.status(400).json({ success: false, error: 'Should have at least one operation' });
    return;
  }

  const proposal = partialTx
    ? PartialTxProposal.fromPartialTx(partialTx, network) : new PartialTxProposal(network);

  if (sendTokens.utxos && sendTokens.utxos.length > 0) {
    try {
      for (const utxo of sendTokens.utxos) {
        const txData = req.wallet.getTx(utxo.txId);
        if (!txData) {
          // utxo not in history
          continue;
        }
        const txout = txData.outputs[utxo.index];
        if (!oldWallet.canUseUnspentTx(txout, txData.height)) {
          // Cannot use this utxo
          continue;
        }

        const addressIndex = req.wallet.getAddressIndex(txout.decoded.address);
        const addressPath = addressIndex ? req.wallet.getAddressPathForIndex(addressIndex) : '';
        let authorities = 0;
        if (oldWallet.isMintOutput(txout)) {
          authorities += TOKEN_MINT_MASK;
        }
        if (oldWallet.isMeltOutput(txout)) {
          authorities += TOKEN_MELT_MASK;
        }

        let tokenId = txout.token;
        if (!tokenId) {
          const tokenIndex = oldWallet.getTokenIndex(txout.token_data) - 1;
          tokenId = txout.token_data === 0
            ? HATHOR_TOKEN_CONFIG.uid
            : txData.tx.tokens[tokenIndex].uid;
        }

        utxos.push({
          txId: utxo.txId,
          index: utxo.index,
          value: txout.value,
          address: txout.decoded.address,
          timelock: txout.decoded.timelock,
          tokenId,
          authorities,
          addressPath,
          heightlock: null,
          locked: false,
        });
      }
      if (sendTokens.utxos && sendTokens.utxos.length !== 0 && utxos.length === 0) {
        // Tried to add utxos but no available utxo was found
        // XXX: this is to avoid the wallet-lib choosing from the history when the user
        // means to manually choose the utxos.
        throw new Error('Could not use any of the utxos.');
      }
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
  }

  try {
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

    let createdProposalId;
    if (constants.SWAP_SERVICE_FEATURE_TOGGLE && serviceParams.is_new) {
      const { proposalId } = await atomicSwapService.serviceCreate(
        req.walletId,
        proposal.partialTx.serialize(),
        serviceParams.password
      );
      createdProposalId = proposalId;
    }

    res.send({
      success: true,
      data: proposal.partialTx.serialize(),
      isComplete: proposal.partialTx.isComplete(),
      createdProposalId,
    });
  } catch (err) {
    res.send({
      success: false,
      error: err.message,
    });
  }
}

/**
 * Get signatures as a serialized PartialTxInputData.
 * Obs: Only signs the loaded wallet inputs.
 */
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

/**
 * Add signatures to a proposal and return the hex of the signed transaction.
 */
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
    const tx = atomicSwapService.assembleTransaction(partialTx, signatures, network);

    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

/**
 * Add signatures to a proposal and push the transaction.
 */
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
    const transaction = atomicSwapService.assembleTransaction(partialTx, sigs, network);

    const sendTransaction = new SendTransaction({ transaction, network });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

/**
 * Extract input data from a transaction hex into a serialized PartialTxInputData
 * to be used with the atomic-swap APIs.
 *
 * Example: P2SH wallets will need to use this API to extract the signatures
 * If you wish to sign the transaction in another way (offline signing, Hardware wallets, etc.)
 * This API can be used to extract the signatures into an atomic-swap complient format.
 */
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

/**
 * Get all utxos that are marked as `selected_as_input`.
 */
async function getLockedUTXOs(req, res) {
  try {
    const utxos = [];
    const historyTransactions = req.wallet.getFullHistory();
    for (const tx of Object.values(historyTransactions)) {
      const marked = [];
      for (const [index, output] of tx.outputs.entries()) {
        if ((!output.spent_by) && output.selected_as_input === true) {
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

/**
 * Unmark utxos `selected_as_input` to free utxos to be spent.
 */
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

/**
 * Fetches the list of proposals being listened to by this wallet on the Atomic Swap Service
 */
async function listenedProposalList(req, res) {
  const proposalMap = await atomicSwapService.getListenedProposals(req.walletId);

  // Transform the map into an array of proposalIds;
  const list = Array.from(proposalMap.keys());
  res.send({ success: true, proposals: list });
}

/**
 * Deletes a listened proposal by proposalId
 */
async function deleteListenedProposal(req, res) {
  try {
    await atomicSwapService.removeListenedProposal(req.walletId, req.params.proposalId);
    res.send({ success: true });
  } catch (e) {
    res.send({ success: false, error: e.message });
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
  listenedProposalList,
  deleteListenedProposal,
};
