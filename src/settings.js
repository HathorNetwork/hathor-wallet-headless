/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const _ = require('lodash');
const {
  config: hathorLibConfig,
  walletUtils,
  errors: hathorLibErrors,
} = require('@hathor/wallet-lib');

const errors = require('./errors');
const { initializedWallets } = require('./services/wallets.service');
const { removeAllWalletProposals } = require('./services/atomic-swap.service');
const { initHathorLib } = require('./app');

/**
 * The multisig configuration object
 * @typedef {Object} MultiSigConfig
 * @property {number} total - Total number of participants, must be equal to the
 * length of `pubkeys`.
 * @property {number} numSignatures - Number of signatures required to send a transaction,
 * must be lower than `total`.
 * @property {string[]} pubkeys - list of participant xpubkeys.
 */

/**
 * @typedef {Object} PluginConfig
 * @property {string} name Plugin name
 * @property {string} file Plugin filename inside the plugin directory.
 */

/**
 * The configuration object
 * @typedef {Object} Configuration
 * @property {string} http_bind_address - The address to run the service
 * @property {number} http_port - The port to run the service
 * @property {string} [http_api_key] - The api key to use, if not present, the
 * api key middleware will be disabled
 * @property {'mainnet'|'testnet'|'privatenet'} network - The expected Hathor
 * network name
 * @property {string} server - The server to connect to.
 * @property {Record<string, string>} seeds - The seeds object.
 * @property {string|null} [httpLogFormat] - The log format to use.
 * @property {string|null} [consoleLevel] - The log level to expose on the console.
 * @property {Record<string, Record<string, any>>} [logging] - The logging configuration
 * @property {string|null} [txMiningUrl] - The tx-mining-service url to use,
 * if not present we will use the default.
 * @property {string|null} [txMiningApiKey] - The api key to send with all
 * requests to the tx-mining-service.
 * @property {string|null} [atomicSwapService] - The atomic swap service url to
 * use, it not present we will use the default.
 * @property {Record<string, MultiSigConfig>} [multisig] - The multisig config object
 * @property {string} [tokenUid] - The default token.
 * @property {number|null} [gapLimit] - a custom gap limit, if not present we
 * will use the default.
 * @property {number|null} [connectionTimeout] - Websocket connection timeout in ms.
 * @property {boolean} [allowPassphrase] - If we allow the use of passphrases
 * when starting a wallet.
 * @property {boolean} [confirmFirstAddress] - If true the user will have to
 * provide the address at index 0 of the wallet he is trying to interact with.
 * @property {string[]} [enabled_plugins] - The plugins we should start when
 * the service starts up.
 * @property {Record<string, PluginConfig>} [plugin_config] - The custom plugin configuration.
 */

/** @type {Configuration} */
let _config = null;
let started = false;
const configPath = './config.js';

/**
 * Import the config and return the contents, removing from the `default` key.
 * @returns {Promise<Configuration>}
 */
async function _importConfig() {
  return (await import(configPath)).default;
}

/**
 * Returns the config object.
 * @returns {Configuration}
 */
function getConfig() {
  if (_config) {
    return _config;
  }
  // Configuration cannot be read at the moment.
  throw new errors.UnavailableConfigError();
}

/**
 *
 */
async function setupConfig() {
  if (started) {
    // This is a server error, so the default middleware will handle it correctly.
    throw new Error('Cannot setup the configuration twice.');
  }

  _config = await _importConfig();
  started = true;
}

async function _stopAllWallets() {
  // stop all wallets
  for (const wallet of initializedWallets.values()) {
    await wallet.stop({ cleanStorage: true, cleanAddresses: true });
    wallet.conn.removeAllListeners();
  }

  // Remove from initialized wallets
  const keys = Array.from(initializedWallets.keys());
  for (const walletId of keys) {
    initializedWallets.delete(walletId);
    await removeAllWalletProposals(walletId);
  }
}

/**
 * Analize the configuration changes and act accordingly
 * @param {Configuration} oldConfig
 * @param {Configuration} newConfig
 */
async function _analizeConfig(oldConfig, newConfig) {
  // TODO: analize newConfig to check that we have a good config

  // Checking changes in the fields:
  // http_post, http_bind_address, http_api_key, consoleLevel, httpLogFormat, enabled_plugins
  if (
    oldConfig.http_port !== newConfig.http_port
    || oldConfig.http_bind_address !== newConfig.http_bind_address
    || oldConfig.http_api_key !== newConfig.http_api_key
    || oldConfig.consoleLevel !== newConfig.consoleLevel
    || oldConfig.httpLogFormat !== newConfig.httpLogFormat
    || (oldConfig.enabled_plugins && oldConfig.enabled_plugins.sort().join('#'))
      !== (newConfig.enabled_plugins && newConfig.enabled_plugins.sort().join('#'))
  ) {
    throw new errors.NonRecoverableConfigChangeError();
  }

  // Checking for changes in seed and multisig fields
  if (oldConfig.seeds) {
    let shouldStop = false;
    for (const [seedKey, oldSeed] of Object.entries(oldConfig.seeds)) {
      // If the new config has changed a seed, we need to stop the wallets
      if (newConfig[seedKey] !== oldSeed) {
        shouldStop = true;
        break;
      }
      // If we had a multisig configuration we need to check that it is still relevant
      // Adding a new multisig configuration will not trigger this
      if (oldConfig.multisig && oldConfig.multisig[seedKey]) {
        // Here we check in order that the newConfig has a multisig config for the same seedKey
        // Then we check that all fields are the same
        if (
          !(newConfig.multisig && newConfig.multisig[seedKey])
          || newConfig.multisig[seedKey].total
            !== oldConfig.multisig[seedKey].total
          || newConfig.multisig[seedKey].numSignatures
            !== oldConfig.multisig[seedKey].numSignatures
          || newConfig.multisig[seedKey].pubkeys.sort().join(';')
            !== oldConfig.multisig[seedKey].pubkeys.sort().join(';')
        ) {
          shouldStop = true;
          break;
        }
      }
    }
    if (shouldStop) {
      await _stopAllWallets();
    }
  }
  if (newConfig.seeds) {
    for (const seed of Object.values(newConfig.seeds)) {
      try {
        const isValid = walletUtils.wordsValid(seed);
        if (!isValid.valid) {
          throw new errors.NonRecoverableConfigChangeError();
        }
      } catch (err) {
        // If the method throws InvalidWords, we should stop the service
        if (err instanceof hathorLibErrors.InvalidWords) {
          throw new errors.NonRecoverableConfigChangeError();
        }
        // If another error is thrown, just bubble it up
        throw err;
      }
    }
  }

  // Checking for changes in server and network
  if (
    oldConfig.server !== newConfig.server
    || oldConfig.network !== newConfig.network
  ) {
    await _stopAllWallets();
    // change network and server in active configuration
    hathorLibConfig.setNetwork(newConfig.network);
    hathorLibConfig.setServerUrl(newConfig.server);
    return;
  }

  // Checking for changes in tokenUid, gapLimit and connectionTimeout
  if (
    oldConfig.tokenUid !== newConfig.tokenUid
    || oldConfig.gapLimit !== newConfig.gapLimit
    || oldConfig.connectionTimeout !== newConfig.connectionTimeout
  ) {
    await _stopAllWallets();
    return;
  }

  // Checking for changes in txMiningUrl, atomicSwapService, txMiningApiKey
  if (
    oldConfig.txMiningUrl !== newConfig.txMiningUrl
    || oldConfig.atomicSwapService !== newConfig.atomicSwapService
    || oldConfig.txMiningApiKey !== newConfig.txMiningApiKey
  ) {
    initHathorLib();
  }
}

async function reloadConfig() {
  const oldConfig = _.cloneDeep(_config);
  _config = null;
  /**
   * *** IMPORTANT ***
   * This will delete the cached config from nodejs cache system
   * The next import will read from the file once again.
   */
  delete require.cache[require.resolve(configPath)];
  const newConfig = await _importConfig();

  // Check config changes
  await _analizeConfig(oldConfig, newConfig);

  // All checks have passed, settings the singleton
  _config = newConfig;
}

module.exports = {
  getConfig,
  reloadConfig,
  setupConfig,
};
