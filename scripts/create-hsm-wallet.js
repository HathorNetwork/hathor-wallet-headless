/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const config = require('../src/config');

/**
 * Creates a new xPriv key on the HSM
 * @param {string} keyName Key name to be created on the HSM
 */
async function createXprivKey(keyName) {
  // Gets the connection data from the global config file
  const hsmConnectionOptions = {
    host: config.hsmHost,
    authUsernamePassword: {
      username: config.hsmUsername,
      password: config.hsmPassword,
    },
  };
  /**
   * Connection object
   * @type {Hsm}
   */
  const hsmConnection = await hsm.connect(hsmConnectionOptions);

  // Creates a key
  const key = await hsmConnection.blockchain.create(
    keyName, // Nome da chave
    hsm.enums.BLOCKCHAIN_KEYS.BIP32_XPRV,
    false, // Exportable
    false, // Temporary
    hsm.enums.VERSION_OPTIONS.BIP32_MAIN_NET
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
 * Creates a promise to delay for a given number of milisseconds
 * @param {number} [ms=1000]
 * @returns {Promise<void>}
 */
async function delay(ms) {
  return new Promise(resolve => { setTimeout(resolve, ms || 1000); });
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
  if (keyName.length > 32) {
    throw new Error('Key name is too long. It must be up to 32 characters.');
  }
  if (!keyName.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error('Key name can only contain alphanumeric characters and underscores.');
  }
}

async function main() {
  // Get the key name from the command line arguments
  const keyName = process.argv[2];
  validateKeyName(keyName);

  return createXprivKey(keyName)
    .then(async results => {
      console.log('New xPriv Key Information:', JSON.stringify(results, null, 2));
      await delay();
      process.exit(0);
    })
    .catch(async e => {
      console.error(e.stack);
      await delay();
      process.exit(1);
    });
}

main();
