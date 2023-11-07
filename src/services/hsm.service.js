/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const { getConfig } = require('../settings');
const {
  lock,
  lockTypes
} = require('../lock');
const { hsmBusyErrorMessage } = require('../helpers/constants');
const { HsmError } = require('../errors');

/**
 * Connects to the HSM and returns the connection object
 * @returns {Promise<Hsm>}
 */
async function hsmConnect() {
  // Ensures that only one connection will be open at any given moment
  const canStart = lock.lock(lockTypes.HSM);
  if (!canStart) {
    throw new HsmError(hsmBusyErrorMessage);
  }

  // Gets the connection data from the global config file
  const { hsmConnectionOptions } = getConfig();

  // Connects to HSM
  const connectionObj = await hsm.connect(hsmConnectionOptions);
  console.log('HSM connected.');

  return connectionObj;
}

async function hsmDisconnect() {
  await hsm.disconnect();
  console.log(`HSM disconnected.`);
  lock.unlock(lockTypes.HSM);
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

/**
 * Debugging function that prints the xPriv and xPub for a given key name
 * @param hsmConnection
 * @param keyName
 * @returns {Promise<void>}
 */
async function consoleXPrivAndXPubForKey(hsmConnection, keyName) {
  const xPriv = await hsmConnection.blockchain.export(
    hsm.enums.IMPORT_EXPORT_FORMAT.XPRIV,
    hsm.enums.BLOCKCHAIN_EXPORT_VERSION.WIF_MAIN_NET,
    true,
    keyName
  );
  const xPub = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.BIP32_XPUB,
    keyName
  );
  console.dir({
    keyName,
    xPrv: xPriv.toString(),
    xPub: xPub.toString(),
  });
}

/**
 * Derivates an HTR xPriv key from a given xPriv key
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName
 * @param {Object} [options]
 * @param {boolean} [options.verbose] Prints each step of the derivation, for debugging purposes
 * @param {number} [options.version] Optional, advanced. Version to calculate the exported xPriv
 * @returns {Promise<{success: boolean, htrKeyName: string}>}
 */
async function derivateHtrCkd(
  hsmConnection,
  hsmKeyName,
  options,
) {
  const childKeyNames = {
    HTR_CKD_BIP_KEYNAME: 'HTR_BIP_KEY',
    HTR_CKD_COIN_KEYNAME: 'HTR_COIN_KEY',
    HTR_CKD_CHANGE_KEYNAME: 'HTR_CHANGE_KEY',
    HTR_CKD_WALLET_KEYNAME: 'HTR_WALLET_KEY',
    HTR_CKD_ADDRESS_KEYNAME: 'HTR_ADDRESS_KEY',
  };
  const verboseKeys = !!options?.verbose;
  if (verboseKeys) {
    await consoleXPrivAndXPubForKey(hsmConnection, hsmKeyName);
  }

  /*
   * Derivation will be made on
   * BIP code / Coin / Change /  Wallet
   *    m/44' / 280' /     0' /       0
   *        1 /    2 /      3 /       4
   */

  // Derivation 1: Bip Code
  const derivationVersion = options?.version
    ? options.version
    : hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET;

  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion, // Version
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + 44, // Derivation index
    verboseKeys, // Exportable
    true, // Temporary
    hsmKeyName, // Parent key name
    childKeyNames.HTR_CKD_BIP_KEYNAME, // Child key name
  );
  if (verboseKeys) {
    await consoleXPrivAndXPubForKey(hsmConnection, childKeyNames.HTR_CKD_BIP_KEYNAME);
  }

  // Derivation 2: Coin
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion,
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + 280,
    verboseKeys,
    true,
    childKeyNames.HTR_CKD_BIP_KEYNAME,
    childKeyNames.HTR_CKD_COIN_KEYNAME,
  );
  if (verboseKeys) {
    await consoleXPrivAndXPubForKey(hsmConnection, childKeyNames.HTR_CKD_COIN_KEYNAME);
  }

  // Derivation 3: Change
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion,
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE,
    verboseKeys,
    true,
    childKeyNames.HTR_CKD_COIN_KEYNAME,
    childKeyNames.HTR_CKD_CHANGE_KEYNAME,
  );
  if (verboseKeys) {
    await consoleXPrivAndXPubForKey(hsmConnection, childKeyNames.HTR_CKD_CHANGE_KEYNAME);
  }

  // Derivation 4: Wallet
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion,
    0,
    verboseKeys,
    true,
    childKeyNames.HTR_CKD_CHANGE_KEYNAME,
    childKeyNames.HTR_CKD_WALLET_KEYNAME,
  );
  if (verboseKeys) {
    await consoleXPrivAndXPubForKey(hsmConnection, childKeyNames.HTR_CKD_WALLET_KEYNAME);
  }

  return {
    success: true,
    htrKeyName: childKeyNames.HTR_CKD_WALLET_KEYNAME,
  };
}

/**
 * Derivates an HTR wallet xPub string from a given HSM xPriv key
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
async function getXPubFromKey(hsmConnection, hsmKeyName, options) {
  const { htrKeyName } = await derivateHtrCkd(hsmConnection, hsmKeyName, options);

  const xPub = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.BIP32_XPUB,
    htrKeyName
  );
  return xPub.toString();
}

/**
 * Signs a partial tx Proposal
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName
 * @param {PartialTxProposal} proposal
 * @returns {Promise<void>}
 */
async function hsmSignPartialTxProposal(hsmConnection, hsmKeyName, proposal) {
  console.log(`Fake signing proposal`);
  proposal.setSignatures('PartialTxInputData|000197613c|0:5455bdf324');
}

module.exports = {
  hsmConnect,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey,
  hsmSignPartialTxProposal,
};
