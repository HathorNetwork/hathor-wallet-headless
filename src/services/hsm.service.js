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

async function derivateHtrCkd(hsmConnection, hsmKeyName) {
  const childKeyNames = {
    HTR_CKD_BIP_KEYNAME: 'HTR_BIP_KEY',
    HTR_CKD_COIN_KEYNAME: 'HTR_COIN_KEY',
    HTR_CKD_CHANGE_KEYNAME: 'HTR_CHANGE_KEY',
    HTR_CKD_WALLET_KEYNAME: 'HTR_WALLET_KEY',
    HTR_CKD_ADDRESS_KEYNAME: 'HTR_ADDRESS_KEY',
  };

  /*
   * Derivation will be made on
   * BIP code / Coin / Change /  Wallet
   *    m/44' / 280' /     0' /       0
   *        1 /    2 /      3 /       4
   */

  // Derivation 1: Bip Code
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET, // Version
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + 44, // Derivation index
    false, // Not exportable
    true, // Temporary
    hsmKeyName, // Parent key name
    childKeyNames.HTR_CKD_BIP_KEYNAME, // Child key name
  );

  // Derivation 2: Coin
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + 280,
    false,
    true,
    childKeyNames.HTR_CKD_BIP_KEYNAME,
    childKeyNames.HTR_CKD_COIN_KEYNAME,
  );

  // Derivation 3: Change
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE,
    false,
    true,
    childKeyNames.HTR_CKD_COIN_KEYNAME,
    childKeyNames.HTR_CKD_CHANGE_KEYNAME,
  );

  // Derivation 4: Wallet
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    0,
    false,
    true,
    childKeyNames.HTR_CKD_CHANGE_KEYNAME,
    childKeyNames.HTR_CKD_WALLET_KEYNAME,
  );

  return {
    success: true,
    htrKeyName: childKeyNames.HTR_CKD_WALLET_KEYNAME,
  };
}

async function getXPubFromKey(hsmConnection, hsmKeyName) {
  const { htrKeyName } = await derivateHtrCkd(hsmConnection, hsmKeyName);

  const xPub = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.BIP32_XPUB,
    htrKeyName
  );
  return xPub.toString();
}

module.exports = {
  hsmConnect,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey,
};
