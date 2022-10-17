/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const {
  PartialTxProposal,
  PartialTxInputData,
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

module.exports = {
  assembleTransaction,
};
