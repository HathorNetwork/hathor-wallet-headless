/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { config as hathorLibConfig, errors, walletUtils } from '@hathor/wallet-lib';
import { WalletStartError } from '../errors';
import version from '../version';
import {
  DEFAULT_PASSWORD, DEFAULT_PIN, SWAP_SERVICE_MAINNET_BASE_URL, SWAP_SERVICE_TESTNET_BASE_URL,
} from '../constants';

/**
 * @typedef {object} WalletConfig
 * @property {string} password - The password
 * @property {string} pinCode - the PIN code
 * @property {string} [xpub] - The xpub key (only in getReadonlyWalletConfig)
 * @property {{ numSignatures: number, pubkeys: string[] }} [multisig] - The multisig data
 * @property {{
 *  policy: string,
 *  startIndex?: number,
 *  endIndex?: number,
 *  gapLimit?: number,
 * }} [scanPolicy] - Scan policy data
 * @property {string} [seed] - The seed (only in getWalletConfigFromSeed)
 * @property {string} [passphrase] - The passphrase (only in getWalletConfigFromSeed)
 */

export function initHathorLib(config) {
  if (config.txMiningUrl) {
    hathorLibConfig.setTxMiningUrl(config.txMiningUrl);
  }

  if (config.txMiningApiKey) {
    hathorLibConfig.setTxMiningApiKey(config.txMiningApiKey);
  }

  // Configures Atomic Swap Service url. Prefers explicit config input, then mainnet or testnet
  if (config.atomicSwapService) {
    hathorLibConfig.setSwapServiceBaseUrl(config.atomicSwapService);
  } else if (config.network === 'mainnet') {
    hathorLibConfig.setSwapServiceBaseUrl(SWAP_SERVICE_MAINNET_BASE_URL);
  } else {
    hathorLibConfig.setSwapServiceBaseUrl(SWAP_SERVICE_TESTNET_BASE_URL);
  }

  // Set package version in user agent
  // We use this string to parse the version from user agent
  // in some of our services, so changing this might break another service
  hathorLibConfig.setUserAgent(`Hathor Wallet Headless / ${version}`);

  // Those configurations will be set when starting the wallet
  // however we can already set them because they are fixed
  // for all wallets and it's useful if we need to run any request
  // to the full node before starting a wallet
  hathorLibConfig.setServerUrl(config.server);
  hathorLibConfig.setNetwork(config.network);
}

export function getReadonlyWalletConfig({
  xpub,
  multisigData = null,
  scanPolicy = null,
}) {
  // Previous versions of the lib would have password and pin default as '123'
  // We currently need something to be defined, otherwise we get an error when starting the wallet
  const walletConfig = {
    xpub,
    password: DEFAULT_PASSWORD,
    pinCode: DEFAULT_PIN,
    multisig: multisigData,
    scanPolicy,
  };

  return walletConfig;
}

export function getWalletConfigFromSeed({
  seed,
  multisigData = null,
  passphrase = null,
  allowPassphrase = false,
  scanPolicy = null,
} = {}) {
  let words;
  // Seed validation
  try {
    const ret = walletUtils.wordsValid(seed);
    words = ret.words;
  } catch (e) {
    if (e instanceof errors.InvalidWords) {
      throw new WalletStartError(`Invalid seed: ${e.message}`);
    }
    // Unhandled error
    throw e;
  }

  // Previous versions of the lib would have password and pin default as '123'
  // We currently need something to be defined, otherwise we get an error when starting the wallet
  const walletConfig = {
    seed: words,
    password: DEFAULT_PASSWORD,
    pinCode: DEFAULT_PIN,
    multisig: multisigData,
    scanPolicy,
  };

  if (passphrase) {
    // If config explicitly allows the /start endpoint to have a passphrase
    if (!allowPassphrase) {
      // To use a passphrase on /start POST request
      // the configuration of the headless must explicitly allow it
      console.error('Failed to start wallet because using a passphrase is not allowed by the current config. See allowPassphrase.');
      throw new WalletStartError('Failed to start wallet. To use a passphrase you must explicitly allow it in the configuration file. Using a passphrase completely changes the addresses of your wallet, only use it if you know what you are doing.');
    }
    walletConfig.passphrase = passphrase;
  }

  return walletConfig;
}
