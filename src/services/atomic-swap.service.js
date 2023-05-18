/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const {
  PartialTxProposal,
  PartialTxInputData,
  swapService,
} = require('@hathor/wallet-lib');

/**
 * @typedef TxProposalConfig
 * @property {string} id Proposal identifier on the Atomic Swap Service
 * @property {string} password Password to access it
 */

/**
 * A map of all the proposals for a wallet.
 * The keys are the proposal ids
 * @typedef {Map<string,TxProposalConfig>} WalletListenedProposals
 */

/**
 * A map of the initialized wallets and their listened proposals.
 * The keys are the wallet-ids
 * @type {Map<string,WalletListenedProposals>}
 */
const walletListenedProposals = new Map();

/**
 * Assemble a transaction from the serialized partial tx and signatures
 * @param {string} partialTx The serialized partial tx
 * @param {string[]} signatures The serialized signatures
 * @param {IStorage} storage The storage object
 */
const assembleTransaction = (partialTx, signatures, storage) => {
  const proposal = PartialTxProposal.fromPartialTx(partialTx, storage);

  const tx = proposal.partialTx.getTx();
  const inputData = new PartialTxInputData(tx.getDataToSign().toString('hex'), tx.inputs.length);
  for (const sig of signatures) {
    inputData.addSignatures(sig);
  }
  proposal.signatures = inputData;
  if (!proposal.isComplete()) {
    throw new Error('Transaction is not complete');
  }
  return proposal.prepareTx();
};

/**
 * Creates the proposal on the Atomic Swap Service, handling errors that may occur on the process
 * @param {string} walletId The initialized wallet identifier that created this proposal
 * @param {string} partialTx Serialized PartialTx
 * @param {string} password Password, length 3 or more
 * @returns {Promise<{ proposalId: string }>} Returns the proposal identifier created by the service
 */
const serviceCreate = async (walletId, partialTx, password) => {
  if (!partialTx) {
    throw new Error('Invalid PartialTx');
  }
  if (!password || !password.length || password.length < 3) {
    throw new Error('Password must have at least 3 characters');
  }

  const { success, id } = await swapService.create(partialTx, password);
  if (!success) {
    throw new Error('Unable to create the proposal on the Atomic Swap Service');
  }

  await addListenedProposal(walletId, id, password);
  return { proposalId: id };
};

/**
 * Creates the proposal on the Atomic Swap Service, handling errors that may occur on the process
 * @param updateParams Parameters related to the proposal itself
 * @param {string} updateParams.partialTx Serialized PartialTx
 * @param {string} updateParams.proposalId Proposal identifier
 * @param {string} updateParams.password Proposal password on the Atomic Swap Service
 * @param {number} updateParams.version Proposal version on the Atomic Swap Service
 * @param {string} [updateParams.signatures] Proposal signatures, if any
 * @returns {Promise<{ success: boolean }>} Returns if the operation was successful
 */
const serviceUpdate = async updateParams => {
  const { success } = await swapService.update(updateParams);

  if (!success) {
    throw new Error('Unable to update the proposal on the Atomic Swap Service');
  }

  return { success };
};

/**
 * Adds a new proposal to the `listenedProposals` map of a wallet.
 * @param {string} walletId
 * @param {string} proposalId
 * @param {string} password
 * @return {Promise<void>}
 */
const addListenedProposal = async (walletId, proposalId, password) => {
  // Checking if this wallet map has been initialized already
  if (!walletListenedProposals.has(walletId)) {
    walletListenedProposals.set(walletId, new Map());
    // TODO: Will also open the websocket channel
  }

  const listenedProposals = walletListenedProposals.get(walletId);
  listenedProposals.set(proposalId, { id: proposalId, password });
  // TODO: Will also add the proposalId to the Atomic Swap Service websocket channel
};

/**
 * Removes a proposal from the `listenedProposals` map of a wallet
 * @param {string} walletId
 * @param {string} proposalId
 * @return {Promise<void>}
 */
const removeListenedProposal = async (walletId, proposalId) => {
  // If this wallet map has not been initialized, just ignore the request
  if (!walletListenedProposals.has(walletId)) {
    return;
  }

  const listenedProposals = walletListenedProposals.get(walletId);
  listenedProposals.delete(proposalId);
  // TODO: Will also remove the proposalId from the Atomic Swap Service websocket channel
  // TODO: If this was the last proposal to be removed, will also delete the channel itself
};

/**
 * Retrieves the map of proposals being listened by this wallet.
 * @param walletId
 * @return {Promise<Map<string, TxProposalConfig>>}
 */
const getListenedProposals = async walletId => walletListenedProposals.get(walletId) || new Map();

/**
 * Removes the `listenedProposals` map for a wallet, if it exists
 * @param {string} walletId
 * @return {Promise<void>}
 */
const removeAllWalletProposals = async walletId => {
  // Remove all of the listened proposals
  walletListenedProposals.delete(walletId);
  // TODO: Will also close the websocket channel
};

/**
 @typedef {Object} AtomicSwapProposal
 @property {string} proposalId - The unique identifier of the atomic swap proposal.
 @property {string} partialTx - The partially constructed transaction of the atomic swap proposal.
 @property {string | null} signatures - The signatures for the atomic swap proposal, if any.
 @property {string} timestamp - The timestamp of when the atomic swap proposal last modified.
 @property {number} version - The current version of the atomic swap proposal.
 @property {Array} history - The history of the atomic swap proposal.
 @property {string} history.partialTx - The partially constructed transaction at a specific point in
 the proposal's history.
 @property {string} history.timestamp - The timestamp of when the proposal reached the corresponding
 partially constructed transaction in its history.
 */

/**
 * Fetches the proposal data from the Atomic Swap Service, handling errors that may occur on the
 * process
 * @param {string} proposalId Proposal identifier on the Service
 * @param {string} password Password, length 3 or more
 * @returns {Promise<AtomicSwapProposal>} Returns the proposal identifier created by the service
 */
const serviceGet = async (proposalId, password) => {
  if (!proposalId) {
    throw new Error('Invalid proposalId');
  }
  if (!password) {
    throw new Error('Invalid password');
  }

  const proposal = await swapService.get(proposalId, password);
  if (!proposal) {
    throw new Error('Unable to fetch the proposal from the Atomic Swap Service');
  }

  return proposal;
};

module.exports = {
  assembleTransaction,
  serviceCreate,
  addListenedProposal,
  removeListenedProposal,
  getListenedProposals,
  removeAllWalletProposals,
  walletListenedProposals,
  serviceGet,
  serviceUpdate,
};
