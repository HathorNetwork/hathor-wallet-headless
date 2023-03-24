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
const { walletListenedProposals } = require('./wallets.service');

/**
 * Assemble a transaction from the serialized partial tx and signatures
 * @param {string} partialTx The serialized partial tx
 * @param {string[]} signatures The serialized signatures
 * @param {Network} network The network object
 */
const assembleTransaction = (partialTx, signatures, network) => {
  const proposal = PartialTxProposal.fromPartialTx(partialTx, network);

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
    // Will also open the websocket channel
  }

  const listenedProposals = walletListenedProposals.get(walletId);
  listenedProposals.set(proposalId, { id: proposalId, password });
  // Will also add the proposalId to the Atomic Swap Service websocket channel
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
  // Will also remove the proposalId from the Atomic Swap Service websocket channel
  // If this was the last proposal to be removed, will also delete the channel itself
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
  // Will also close the websocket channel
};

module.exports = {
  assembleTransaction,
  serviceCreate,
  addListenedProposal,
  removeListenedProposal,
  getListenedProposals,
  removeAllWalletProposals,
};
