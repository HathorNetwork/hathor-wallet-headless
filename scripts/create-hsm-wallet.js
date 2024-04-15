/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const { isNumber } = require('lodash');
// eslint-disable-next-line import/no-unresolved, import/extensions
const settings = require('../dist/settings');

/**
 * Creates a new xPriv key on the HSM
 * @param {string} keyName Key name to be created on the HSM
 * @see https://manual.dinamonetworks.io/nodejs/pages/examples/blockchain_create_key.html
 */
async function createXprivKey(keyName) {
  const config = settings.getConfig();
  // Gets the connection data from the global config file
  const hsmConnectionOptions = {
    host: config.hsmHost,
    authUsernamePassword: {
      username: config.hsmUsername,
      password: config.hsmPassword,
    },
  };
  const hsmConnection = await hsm.connect(hsmConnectionOptions);

  /**
   * Defines the version of the created xPriv key. As a default, we use the BitCoin Mainnet.
   * @type {hsm.enums.VERSION_OPTIONS}
   * @see https://manual.dinamonetworks.io/nodejs/enums/hsm.enums.VERSION_OPTIONS.html
   * @see https://en.bitcoin.it/wiki/List_of_address_prefixes
   */
  const version = hsm.enums.VERSION_OPTIONS.BIP32_MAIN_NET;

  // Creates a BIP32 xPriv key
  const key = await hsmConnection.blockchain.create(
    keyName, // Name of the key
    hsm.enums.BLOCKCHAIN_KEYS.BIP32_XPRV,
    false, // Exportable
    false, // Temporary
    version,
  );

  if (!key) {
    throw new Error(`Failed to create key: ${keyName}`);
  }

  // Retrieves key info to confirm its creation
  const keyInfo = await hsmConnection.blockchain.getKeyInfo(keyName);

  await hsm.disconnect();
  return keyInfo;
}

/**
 * Creates a promise to delay for a given number of milliseconds
 * @param {number} ms Number of milliseconds to delay. Allows zero.
 * @returns {Promise<void>}
 */
async function delay(ms) {
  if (!isNumber(ms) || ms < 0) {
    throw new Error('Delay time must be a non-negative integer');
  }
  return new Promise(resolve => { setTimeout(resolve, ms); });
}

/**
 * Key names on HSM must be under 32 characters and can only contain alphanumeric characters
 * and underscores. To avoid naming issues, this method also requires the key name to be
 * at least 3 characters long.
 *
 * @param {string} keyName
 * @throws {Error} If the key name is invalid
 * @see https://docs.hsm.dinamonetworks.io/arquitetura/chaves-objetos
 */
function validateKeyName(keyName) {
  if (!keyName || keyName.length < 3) {
    throw new Error('Invalid key name. Usage: node create-hsm-wallet.js <key-name>');
  }
  // Actual keyname is up to 32 chars, but we reserve 17 chars to add context to keyname
  if (keyName.length > 15) {
    throw new Error('Key name is too long. It must be up to 15 characters.');
  }
  if (!keyName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error('Key name can only contain alphanumeric characters and underscores.');
  }
}

async function main() {
  // Get the key name from the command line arguments
  const keyName = process.argv[2];
  validateKeyName(keyName);

  await settings.setupConfig();

  try {
    const results = await createXprivKey(keyName);
    console.log('New xPriv Key Information:', JSON.stringify(results, null, 2));
    await delay(1000); // Allows enough time for the stdout to be written before exiting
    process.exit(0);
  } catch (e) {
    console.error(e.stack);
    await delay(1000); // Allows enough time for the stderr to be written before exiting
    process.exit(1);
  }
}

main();
