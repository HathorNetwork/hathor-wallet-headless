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
  transactionUtils,
  constants: { HATHOR_TOKEN_CONFIG, TOKEN_MINT_MASK, TOKEN_MELT_MASK },
} = require('@hathor/wallet-lib');
const atomicSwapService = require('../../../services/atomic-swap.service');
const { parametersValidation } = require('../../../helpers/validations.helper');
const { lock, lockTypes } = require('../../../lock');
const { cantSendTxErrorMessage } = require('../../../helpers/constants');
const { mapTxReturn } = require('../../../helpers/tx.helper');
const constants = require('../../../constants');
const { removeListenedProposal } = require('../../../services/atomic-swap.service');

/**
 * Build or update a partial transaction proposal.
 */
async function buildTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { wallet } = req;

  const sendTokens = req.body.send || { tokens: [] };
  const receiveTokens = req.body.receive || { tokens: [] };
  const changeAddress = req.body.change_address || null;
  const partialTx = req.body.partial_tx || null;
  let markAsSelected = true;
  if (req.body.lock !== undefined) {
    markAsSelected = req.body.lock;
  }
  /** @type {{password?: string, is_new?: boolean, proposal_id?: string, version?: number}} */
  const serviceParams = req.body.service || {};

  const utxos = [];

  if (sendTokens.tokens.length === 0 && receiveTokens.tokens.length === 0) {
    res.status(400).json({ success: false, error: 'Should have at least one operation' });
    return;
  }

  // Deserializing the proposal from the partial_tx, if informed, or creating an empty new one
  let proposal;
  try {
    proposal = partialTx
      ? PartialTxProposal.fromPartialTx(partialTx, wallet.storage)
      : new PartialTxProposal(wallet.storage);
  } catch (e) {
    res.json({ success: false, error: e.message });
    return;
  }

  if (sendTokens.utxos && sendTokens.utxos.length > 0) {
    try {
      for (const utxo of sendTokens.utxos) {
        const txData = await wallet.getTx(utxo.txId);
        if (!txData) {
          // utxo not in history
          continue;
        }
        const txout = txData.outputs[utxo.index];
        if (!await transactionUtils.canUseUtxo(
          { txId: utxo.txId, index: utxo.index },
          wallet.storage,
        )) {
          // Cannot use this utxo
          continue;
        }

        const addressIndex = await wallet.getAddressIndex(txout.decoded.address);
        const addressPath = addressIndex ? await req.wallet.getAddressPathForIndex(addressIndex) : '';
        let authorities = 0;
        if (transactionUtils.isMint(txout)) {
          authorities += TOKEN_MINT_MASK;
        }
        if (transactionUtils.isMelt(txout)) {
          authorities += TOKEN_MELT_MASK;
        }

        utxos.push({
          txId: utxo.txId,
          index: utxo.index,
          value: txout.value,
          address: txout.decoded.address,
          timelock: txout.decoded.timelock,
          tokenId: txout.token,
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
      await proposal.addSend(token, send.value, { utxos, changeAddress, markAsSelected });
    }

    for (const receive of receiveTokens.tokens) {
      const token = receive.token || HATHOR_TOKEN_CONFIG.uid;
      const timelock = receive.timelock || null;
      const address = receive.address || null;
      await proposal.addReceive(
        token,
        receive.value,
        { timelock, address }
      );
    }

    let createdProposalId;
    if (constants.SWAP_SERVICE_FEATURE_TOGGLE) {
      if (serviceParams.is_new) {
        // Handling the creation of a new proposal with the Atomic Swap Service
        const { proposalId } = await atomicSwapService.serviceCreate(
          req.walletId,
          proposal.partialTx.serialize(),
          serviceParams.password
        );
        createdProposalId = proposalId;
      } else if (serviceParams.proposal_id) {
        // Handling the update of an existing proposal with the Atomic Swap Service

        // First, validate if the proposal is already registered with this wallet
        const listenedProposals = await atomicSwapService.getListenedProposals(req.walletId);
        if (!listenedProposals.has(serviceParams.proposal_id)) {
          res.status(404);
          res.send({
            success: false,
            error: 'Proposal is not registered. Register it first.',
          });
          return;
        }

        // Retrieving registered proposal password
        const requestedProposal = listenedProposals.get(serviceParams.proposal_id);
        const { password } = requestedProposal;

        await atomicSwapService.serviceUpdate(
          {
            proposalId: serviceParams.proposal_id,
            password,
            partialTx: proposal.partialTx.serialize(),
            version: serviceParams.version,
          }
        );
      }
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
 * Fetches all proposal data from the Atomic Swap Service for a specific identifier
 */
async function fetchFromService(req, res) {
  if (!constants.SWAP_SERVICE_FEATURE_TOGGLE) {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { walletId } = req;
  const { proposalId } = req.params;
  const listenedProposals = await atomicSwapService.getListenedProposals(walletId);
  if (!listenedProposals.has(proposalId)) {
    res.status(404);
    res.send({
      success: false,
      error: 'Proposal is not registered. Register it first through [POST] /register/:proposalId',
    });
    return;
  }

  const requestedProposal = listenedProposals.get(proposalId);
  const { password } = requestedProposal;

  // Fetching proposal from the service
  try {
    const serviceProposal = await atomicSwapService.serviceGet(proposalId, password);
    res.json({ success: true, proposal: serviceProposal });
  } catch (err) {
    // If the proposal no longer exists on the backend, remove it from our listened map
    if (err.isAxiosError && err.response.status === 404) {
      res.status(404);
      await removeListenedProposal(walletId, proposalId);
    }

    res.send({ success: false, error: err.message });
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

  const partialTx = req.body.partial_tx;

  try {
    const proposal = PartialTxProposal.fromPartialTx(partialTx, req.wallet.storage);
    await proposal.signData(constants.DEFAULT_PIN);
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

  const partialTx = req.body.partial_tx;
  const signatures = req.body.signatures || [];
  const { proposal_id: proposalId, version } = req.body.service || {};

  try {
    const tx = atomicSwapService.assembleTransaction(partialTx, signatures, req.wallet.storage);

    // Updating the service, if a proposal id was informed
    if (constants.SWAP_SERVICE_FEATURE_TOGGLE && proposalId) {
      // First, validate if the proposal is already registered with this wallet
      const listenedProposals = await atomicSwapService.getListenedProposals(req.walletId);
      if (!listenedProposals.has(proposalId)) {
        res.status(404);
        res.send({
          success: false,
          error: 'Proposal is not registered. Register it first.',
        });
        return;
      }

      // Retrieving registered proposal password
      const requestedProposal = listenedProposals.get(proposalId);
      const { password } = requestedProposal;

      await atomicSwapService.serviceUpdate(
        {
          proposalId,
          password,
          partialTx,
          version,
          signatures: tx.signatures,
        }
      );
    }

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

  const partialTx = req.body.partial_tx;
  const sigs = req.body.signatures || [];

  try {
    const transaction = atomicSwapService.assembleTransaction(partialTx, sigs, req.wallet.storage);

    const sendTransaction = new SendTransaction({ transaction, storage: req.wallet.storage });
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
    const txMap = new Map();
    for await (const utxo of req.wallet.storage.utxoSelectedAsInputIter()) {
      if (!txMap.has(utxo.txId)) {
        txMap.set(utxo.txId, new Set());
      }
      txMap.get(utxo.txId).add(utxo.index);
    }
    const utxos = [];
    for (const txEntry of txMap.entries()) {
      utxos.push({
        tx_id: txEntry[0],
        outputs: Array.from(txEntry[1]),
      });
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
      await req.wallet.markUtxoSelected(input.hash, input.index, false);
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
 * Registers a proposal on this wallet, storing its identifier and password locally
 */
async function registerProposal(req, res) {
  const { walletId } = req;
  const { proposalId } = req.params;
  const { password } = req.body;

  // Avoid making requests to the service if the proposal is already on local storage
  const proposalMap = await atomicSwapService.getListenedProposals(walletId);
  if (proposalMap.has(proposalId)) {
    // Validating if the informed password is correct
    const existingProposal = proposalMap.get(proposalId);
    if (existingProposal.password !== password) {
      res.send({
        success: false,
        error: 'Incorrect password',
      });
      return;
    }
    res.send({ success: true });
    return;
  }

  try {
    const proposal = await atomicSwapService.serviceGet(proposalId, password);

    await atomicSwapService.addListenedProposal(
      walletId,
      proposal.proposalId,
      password,
    );
    res.send({ success: true });
  } catch (err) {
    console.error(err.stack);
    res.send({
      success: false,
      error: err.message,
    });
  }
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
  fetchFromService,
  getMySignatures,
  signAndPush,
  signTx,
  unlockInputs,
  listenedProposalList,
  registerProposal,
  deleteListenedProposal,
};
