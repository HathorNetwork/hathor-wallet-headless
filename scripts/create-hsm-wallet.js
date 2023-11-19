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

async function delay(ms) {
  return new Promise(resolve => { setTimeout(resolve, ms || 1000); });
}

const keyName = 'htr_test_script';
createXprivKey(keyName)
  .then(async results => {
    console.log('New xPriv Key Information:', JSON.stringify(results));
    await delay();
    process.exit(0);
  })
  .catch(async e => {
    console.error(e.stack);
    await delay();
    process.exit(1);
  });
