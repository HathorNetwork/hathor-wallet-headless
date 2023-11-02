/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const { getConfig } = require('../settings');

/**
 * Connects to the HSM and returns the connection object
 * @returns {Promise<Hsm>}
 */
async function hsmConnect() {
  // Gets the connection data from the global config file
  const { hsmConnectionOptions } = getConfig();

  // Connects to HSM
  const connectionObj = await hsm.connect(hsmConnectionOptions);
  console.log('HSM connected.');

  return connectionObj;
}

async function hsmDisconnect() {
  return hsm.disconnect();
}

/**
 *
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName
 * @returns {Promise<{reason?: string, isValidXpriv: boolean, hsmKeyName}>}
 */
async function isKeyValidXpriv(hsmConnection, hsmKeyName) {
  const returnObject = {
    hsmKeyName,
    isValidXpriv: false,
    reason: '',
  };

  let keyInfo;
  try {
    keyInfo = await hsmConnection.blockchain.getKeyInfo(hsmKeyName);
  } catch (e) {
    // Special treatment for a wallet not configured on the HSM
    if (e.errorCode === 5004) {
      returnObject.reason = `Key does not exist on HSM.`;
      return returnObject;
    }
    console.error(`Unexpected getKeyInfo error: ${e.message}`);
    throw e;
  }

  console.log(keyInfo);
  if (keyInfo.type !== hsm.enums.BLOCKCHAIN_KEYS.BIP32_XPRV) {
    returnObject.reason = `Key is not a valid xPriv.`;
    return returnObject;
  }
  if (!(keyInfo.ver in [
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_TEST_NET,
  ])) {
    returnObject.reason = `Key is not a valid Hathor xPriv.`;
    return returnObject;
  }

  delete returnObject.reason;
  returnObject.isValidXpriv = true;
  return returnObject;
}

module.exports = {
  hsmConnect,
  hsmDisconnect,
  isKeyValidXpriv
};
