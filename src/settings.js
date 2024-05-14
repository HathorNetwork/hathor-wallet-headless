/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const _ = require('lodash');
const {
  walletUtils,
  errors: hathorLibErrors,
} = require('@hathor/wallet-lib');
const errors = require('./errors');
const { stopAllWallets } = require('./services/wallets.service');
const { initHathorLib } = require('./helpers/wallet.helper');

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
 * @property {string|null} [hsmHost] - The HSM host to use. If not present,
 * HSM integration will be disabled
 * @property {string|null} [hsmUsername] - The HSM username to use.
 * @property {string|null} [hsmPassword] - The HSM password to use.
 * @property {string|null} [fireblocksUrl] - The fireblocks url to use.
 * @property {string|null} [fireblocksApiKey] - The fireblocks api key to use.
 * @property {string|null} [fireblocksApiSecret] - The fireblocks api secret to use.
 * @property {string|null} [fireblocksApiSecretFile] - The filepath of the fireblocks api secret.
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
 * @property {boolean} [considerHealthcheckWarnAsUnhealthy] - If true, the healthcheck
 * will consider a warn as unhealthy.
 */

/**
 * @typedef {Object} ConfigReloadAction
 * @property {bool} stopAllWallets If we should stop all running wallets.
 * @property {bool} reconfigLib If we should run a method to update all known lib configuration.
 * @property {bool} nonRecoverable The change is unrecoverable for the current running app.
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

/**
 * Take the necessary actions to update the configuration.
 * @param {ConfigReloadAction} action
 * @returns {Promise<void>}
 * @throws {NonRecoverableConfigChangeError}
 */
async function _updateConfig(action, config) {
  if (action.nonRecoverable) {
    throw new errors.NonRecoverableConfigChangeError();
  }

  if (action.stopAllWallets) {
    await stopAllWallets();
  }

  if (action.reconfigLib) {
    initHathorLib(config);
  }
}

/**
 * Analize the configuration changes and act accordingly
 * @param {Configuration} oldConfig
 * @param {Configuration} newConfig
 */
async function _analizeConfig(oldConfig, newConfig) {
  // TODO: analize newConfig to check that we have a good config

  /** @type {ConfigReloadAction} */
  const action = {
    stopAllWallets: false,
    reconfigLib: false,
    nonRecoverable: false,
  };

  // Checking changes in the fields:
  // http_post, http_bind_address, http_api_key, consoleLevel, httpLogFormat, enabled_plugins
  // fireblocksUrl, fireblocksApiKey, fireblocksApiSecret, fireblocksApiSecretFile
  //
  // We also do not support changing the HSM Credentials because a connection may be open at
  // the moment of the config change, and that would require a more complex logic to handle.
  if (
    oldConfig.http_port !== newConfig.http_port
    || oldConfig.http_bind_address !== newConfig.http_bind_address
    || oldConfig.http_api_key !== newConfig.http_api_key
    || oldConfig.consoleLevel !== newConfig.consoleLevel
    || oldConfig.httpLogFormat !== newConfig.httpLogFormat
    || (oldConfig.enabled_plugins && oldConfig.enabled_plugins.sort().join('#'))
      !== (newConfig.enabled_plugins && newConfig.enabled_plugins.sort().join('#'))
    || oldConfig.hsmHost !== newConfig.hsmHost
    || oldConfig.hsmUsername !== newConfig.hsmUsername
    || oldConfig.hsmPassword !== newConfig.hsmPassword
    || oldConfig.fireblocksUrl !== newConfig.fireblocksUrl
    || oldConfig.fireblocksApiKey !== newConfig.fireblocksApiKey
    || oldConfig.fireblocksApiSecret !== newConfig.fireblocksApiSecret
    || oldConfig.fireblocksApiSecretFile !== newConfig.fireblocksApiSecretFile
  ) {
    action.nonRecoverable = true;
    return action;
  }

  // Checking for changes in seed and multisig fields
  if (oldConfig.seeds) {
    let shouldStop = false;
    for (const [seedKey, oldSeed] of Object.entries(oldConfig.seeds)) {
      // If the new config has changed a seed, we need to stop the wallets
      if (newConfig.seeds[seedKey] !== oldSeed) {
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
      action.stopAllWallets = true;
    }
  }
  if (newConfig.seeds) {
    for (const seed of Object.values(newConfig.seeds)) {
      try {
        const isValid = walletUtils.wordsValid(seed);
        if (!isValid.valid) {
          action.nonRecoverable = true;
          return action;
        }
      } catch (err) {
        // If the method throws InvalidWords, we should stop the service
        if (err instanceof hathorLibErrors.InvalidWords) {
          action.nonRecoverable = true;
          return action;
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
    action.stopAllWallets = true;
    action.reconfigLib = true;
  }

  // Checking for changes in tokenUid, gapLimit and connectionTimeout
  if (
    oldConfig.tokenUid !== newConfig.tokenUid
    || oldConfig.gapLimit !== newConfig.gapLimit
    || oldConfig.connectionTimeout !== newConfig.connectionTimeout
  ) {
    action.stopAllWallets = true;
  }

  // Checking for changes in txMiningUrl, atomicSwapService, txMiningApiKey
  if (
    oldConfig.txMiningUrl !== newConfig.txMiningUrl
    || oldConfig.atomicSwapService !== newConfig.atomicSwapService
    || oldConfig.txMiningApiKey !== newConfig.txMiningApiKey
  ) {
    action.reconfigLib = true;
  }

  return action;
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
  const action = await _analizeConfig(oldConfig, newConfig);
  await _updateConfig(action, newConfig);

  // All checks have passed, settings the singleton
  _config = newConfig;
}

module.exports = {
  getConfig,
  reloadConfig,
  setupConfig,
};
