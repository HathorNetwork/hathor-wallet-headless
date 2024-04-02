/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Connection, HathorWallet } = require('@hathor/wallet-lib');
const { removeAllWalletProposals } = require('./atomic-swap.service');
const { notificationBus } = require('./notification.service');
const { sanitizeLogInput } = require('../logger');

/**
 * All wallets that were initialized by the user, mapped by their identifier
 * @type {Map<string, HathorWallet>}
 */
const initializedWallets = new Map();

/**
 * A map between Wallet IDs and HSM Key names of the initialized wallets
 * @type {Map<string, string>}
 */
const hsmWalletIds = new Map();

/**
 * Stop a wallet
 * @param {string} walletId
 * @returns {Promise<void>}
 */
async function stopWallet(walletId) {
  // Cleans the wallet from the initialized wallets map
  const wallet = initializedWallets.get(walletId);
  if (!wallet) {
    return;
  }
  // Cleans the wallet from the hard wallets map
  if (hsmWalletIds.has(walletId)) {
    hsmWalletIds.delete(walletId);
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

/**
 * Starts the wallet with the given configuration objects:
 * one for the wallet instance and other for the application.
 *
 * Returns an object containing the fullnode version data.
 *
 * @param {string} walletId User identifier for the wallet
 * @param {WalletConfig} walletConfig Wallet configuration
 * @param {Configuration} config Application configuration
 * @param {object} [options={}] Additional options
 * @param {string} [options.hsmKeyName] HSM key name
 * @returns {Promise<Object>} Returns the fullnode version data
 */
async function startWallet(walletId, walletConfig, config, options = {}) {
  if (walletConfig.connection) {
    throw new Error('Invalid parameter for startWallet helper');
  }
  const hydratedWalletConfig = { ...walletConfig };

  // Builds the connection object
  hydratedWalletConfig.connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });

  // tokenUid is optional but if not passed as parameter the wallet will use HTR
  if (config.tokenUid) {
    hydratedWalletConfig.tokenUid = config.tokenUid;
  }

  const wallet = new HathorWallet(hydratedWalletConfig);

  if (config.gapLimit) {
    // XXX: The gap limit is now a per-wallet configuration
    // To keep the same behavior as before, we set the gap limit
    // when creating the wallet, but we should move this to the
    // wallet configuration in the future
    await wallet.setGapLimit(config.gapLimit);
  }

  // subscribe to wallet events with notificationBus
  notificationBus.subscribeHathorWallet(walletId, wallet);

  const info = await wallet.start();
  // The replace avoids Log Injection
  console.log(`Wallet started with wallet id ${sanitizeLogInput(walletId)}. \
Full-node info: ${JSON.stringify(info, null, 2)}`);

  initializedWallets.set(walletId, wallet);
  if (options?.hsmKeyName) {
    hsmWalletIds.set(walletId, options.hsmKeyName);
  }
  return info;
}

/**
 * Returns true if a wallet id represents an initialized hardware wallet
 * @param {string} walletId
 * @returns {boolean} True if this is a hardware wallet
 */
function isHsmWallet(walletId) {
  return initializedWallets.has(walletId)
    && hsmWalletIds.has(walletId)
    && hsmWalletIds.get(walletId);
}

module.exports = {
  initializedWallets,
  hsmWalletIds,
  isHsmWallet,
  stopWallet,
  stopAllWallets,
  startWallet,
};
