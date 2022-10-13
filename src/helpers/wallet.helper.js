/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { HathorWallet, wallet, walletUtils } from "@hathor/wallet-lib";
import { initializedWallets } from "../services/wallets.service";
import config from '../config';

export class WalletStartError extends Error {};

export function getReadonlyWallet({
  xpub,
  multisigData = null,
  preCalculatedAddresses = [],
}) {
  const connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });
  
  // Previous versions of the lib would have password and pin default as '123'
  // We currently need something to be defined, otherwise we get an error when starting the wallet
  const walletConfig = {
    xpub,
    connection,
    password: '123',
    pinCode: '123',
    multisig: multisigData,
  };
  
  // tokenUid is optional but if not passed as parameter the wallet will use HTR
  if (config.tokenUid) {
    walletConfig.tokenUid = config.tokenUid;
  }

  // Wallet addresses pre-calculation, usually for speeding up tests
  if (preCalculatedAddresses && preCalculatedAddresses.length) {
    console.log(`Received pre-calculated addresses`, preCalculatedAddresses);
    walletConfig.preCalculatedAddresses = preCalculatedAddresses;
  }

  return new HathorWallet(walletConfig);
}

export function getWalletFromSeed({
  seed,
  multisigData = null,
  passphrase = null,
  preCalculatedAddresses = [],
} = {}) {
  // Seed validation
  try {
    const ret = walletUtils.wordsValid(seed);
    seed = ret.words;
  } catch (e) {
    if (e instanceof errors.InvalidWords) {
      throw new WalletStartError(`Invalid seed: ${e.message}`);
    }
    // Unhandled error
    throw e;
  }

  const connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });
  
  // Previous versions of the lib would have password and pin default as '123'
  // We currently need something to be defined, otherwise we get an error when starting the wallet
  const walletConfig = {
    seed,
    connection,
    password: '123',
    pinCode: '123',
    multisig: multisigData,
  };
  
  // tokenUid is optional but if not passed as parameter the wallet will use HTR
  if (config.tokenUid) {
    walletConfig.tokenUid = config.tokenUid;
  }
  
  if (passphrase) {
    // If config explicitly allows the /start endpoint to have a passphrase
    const allowPassphrase = config.allowPassphrase || false;

    if (!allowPassphrase) {
      // To use a passphrase on /start POST request the configuration of the headless must explicitly allow it
      console.error('Failed to start wallet because using a passphrase is not allowed by the current config. See allowPassphrase.');
      throw new WalletStartError('Failed to start wallet. To use a passphrase you must explicitly allow it in the configuration file. Using a passphrase completely changes the addresses of your wallet, only use it if you know what you are doing.');
    }
    walletConfig.passphrase = passphrase;
  }

  // Wallet addresses pre-calculation, usually for speeding up tests
  if (preCalculatedAddresses && preCalculatedAddresses.length) {
    console.log(`Received pre-calculated addresses`, preCalculatedAddresses);
    walletConfig.preCalculatedAddresses = preCalculatedAddresses;
  }

  return new HathorWallet(walletConfig);
}