/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { removeAllWalletProposals } = require('./atomic-swap.service');

/**
 * @type {Map<string, HathorWallet>}
 */
const initializedWallets = new Map();
const hardWalletIds = new Map();

/**
 * Stop a wallet
 * @param {string} walletId
 * @returns {Promise<void>}
 */
async function stopWallet(walletId) {
  const wallet = initializedWallets.get(walletId);
  if (!wallet) {
    return;
  }
  await wallet.stop();
  initializedWallets.delete(walletId);
  await removeAllWalletProposals(walletId);
}

/**
 * Stop all wallets
 * @returns {Promise<void>}
 * @throws {NonRecoverableConfigChangeError}
 */
async function stopAllWallets() {
  for (const wallet of initializedWallets.values()) {
    await wallet.stop({ cleanStorage: true, cleanAddresses: true });
    wallet.conn.removeAllListeners();
  }

  for (const walletId of Array.from(initializedWallets.keys())) {
    initializedWallets.delete(walletId);
    await removeAllWalletProposals(walletId);
  }
}

module.exports = {
  initializedWallets,
  hardWalletIds,
  stopWallet,
  stopAllWallets,
};
