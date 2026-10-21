/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @typedef {import('@hathor/wallet-lib/lib/types').IHistoryTx} IHistoryTx
 */

/**
 * Fields wallet-lib writes on the wallet's own shielded outputs that open
 * their commitments. Anyone holding them can prove the amount and token of
 * the output, so they must only leave the wallet on purpose, through
 * `GET /wallet/shielded/unblinding`.
 */
const SHIELDED_OUTPUT_SECRETS = ['blindingFactor', 'assetBlindingFactor'];

/**
 * Return a copy of a history transaction without the blinding factors of its
 * shielded outputs. The decoded value and token are kept: they are the
 * wallet's own view of its funds.
 *
 * The stored transaction is not modified.
 *
 * @param {IHistoryTx} tx
 * @returns {IHistoryTx}
 */
function stripShieldedSecrets(tx) {
  if (!tx || !Array.isArray(tx.shielded_outputs)) {
    return tx;
  }
  return {
    ...tx,
    shielded_outputs: tx.shielded_outputs.map(output => {
      const copy = { ...output };
      for (const field of SHIELDED_OUTPUT_SECRETS) {
        delete copy[field];
      }
      return copy;
    }),
  };
}

module.exports = {
  stripShieldedSecrets,
};
