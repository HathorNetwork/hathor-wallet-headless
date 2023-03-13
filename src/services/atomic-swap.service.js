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
 * @param {string} partialTx Serialized PartialTx
 * @param {string} password Password, length 3 or more
 * @returns {Promise<{ proposalId: string }>} Returns the proposal identifier created by the service
 */
const serviceCreate = async (partialTx, password) => {
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

  return { proposalId: id };
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
  if (!password || !password.length || password.length < 3) {
    throw new Error('Password must have at least 3 characters');
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
  serviceGet,
};
