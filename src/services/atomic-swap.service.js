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
  AtomicSwapServiceConnection,
} = require('@hathor/wallet-lib');
const config = require('../config');

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
 * A map of the initialiazed websocket channels for the wallets to communicate
 * with the Atomic Swap Service
 * @type {Map<string, AtomicSwapServiceConnection>}
 */
const walletWebsocketChannels = new Map();

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
 * Retrieves the Atomic Swap websocket channel for this wallet.
 * Returns null if there isn't any.
 * @param {string} walletId
 * @return {AtomicSwapServiceConnection|null}
 */
const getWalletChannel = walletId => {
  if (!walletWebsocketChannels.has(walletId)) {
    return null;
  }

  return walletWebsocketChannels.get(walletId);
};

/**
 * Initializes an Atomic Swap websocket channel for the specified wallet and network
 * @param {string} walletId
 * @param {string} network
 * @return {Promise<AtomicSwapServiceConnection>}
 */
const initializeWalletChannel = async (walletId, network) => {
  // Avoid instantiating multiple channels for the same wallet
  if (walletWebsocketChannels.has(walletId)) {
    return getWalletChannel(walletId);
  }

  const atomicConnection = new AtomicSwapServiceConnection(
    { network },
    config.atomicSwapServiceWs,
  );
  await atomicConnection.start();
  walletWebsocketChannels.set(walletId, atomicConnection);

  return atomicConnection;
};

/**
 * Closes the wallet channel and removes it from the local channels map
 * @param {string} walletId
 * @return {Promise<void>}
 */
const disconnectWalletChannel = async walletId => {
  // Do nothing if there is no channel for this wallet
  if (!walletWebsocketChannels.has(walletId)) {
    return;
  }

  const channel = walletWebsocketChannels.get(walletId);
  await channel.stop();
  walletWebsocketChannels.delete(walletId);
};

module.exports = {
  assembleTransaction,
  serviceCreate,
  addListenedProposal,
  removeListenedProposal,
  getListenedProposals,
  removeAllWalletProposals,
  walletListenedProposals,

  getWalletChannel,
  initializeWalletChannel,
  disconnectWalletChannel,
};
