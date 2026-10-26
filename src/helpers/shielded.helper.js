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
 * The fields of a history shielded output that may leave the wallet: the
 * on-chain data, and the decoded value and token of the wallet's own outputs.
 * wallet-lib also writes the blinding factors that open the output's
 * commitments (`blindingFactor`, `assetBlindingFactor`), which prove its amount
 * and token and must only leave the wallet on purpose, through
 * `GET /wallet/shielded/unblinding`. The list is an allow-list, so a field a
 * future wallet-lib adds is dropped until it is reviewed here.
 */
const PUBLIC_SHIELDED_OUTPUT_FIELDS = [
  'mode',
  'script',
  'token_data',
  'decoded',
  'commitment',
  'range_proof',
  'ephemeral_pubkey',
  'asset_commitment',
  'surjection_proof',
  'spent_by',
  'value',
  'token',
];

/**
 * Return a copy of a history transaction whose shielded outputs keep only
 * their public fields (PUBLIC_SHIELDED_OUTPUT_FIELDS).
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
    shielded_outputs: tx.shielded_outputs.map(output => Object.fromEntries(
      PUBLIC_SHIELDED_OUTPUT_FIELDS
        .filter(field => field in output)
        .map(field => [field, output[field]])
    )),
  };
}

/**
 * Whether an address of the wallet is a legacy one. A shielded receive address
 * and the spend-derived P2PKH a shielded output is paid to share their index
 * with the legacy address, but not its key.
 *
 * @param {import('@hathor/wallet-lib').HathorWallet} wallet
 * @param {string} address
 * @returns {Promise<boolean>}
 */
async function isLegacyAddress(wallet, address) {
  const info = await wallet.storage.getAddressInfo(address);
  return !['shielded', 'shielded-spend'].includes(info?.addressType);
}

module.exports = {
  stripShieldedSecrets,
  isLegacyAddress,
};
