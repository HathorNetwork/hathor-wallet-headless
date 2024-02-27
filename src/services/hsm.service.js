/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const hathorLib = require('@hathor/wallet-lib');
const _ = require('lodash');

const { getConfig } = require('../settings');
const { lock, lockTypes } = require('../lock');
const { hsmBusyErrorMessage } = require('../helpers/constants');
const { HsmError } = require('../errors');

/**
 * Connects to the HSM and returns the connection object
 * @returns {Promise<hsm.interfaces.Hsm>}
 */
async function hsmConnect() {
  // Ensures there is a config for the HSM integration
  const config = getConfig();
  if (!config.hsmHost || !config.hsmUsername || !config.hsmPassword) {
    throw new HsmError('HSM integration is not configured');
  }

  // Ensures that only one connection will be open at any given moment
  const canStart = lock.lock(lockTypes.HSM);
  if (!canStart) {
    throw new HsmError(hsmBusyErrorMessage);
  }

  // Gets the connection data from the global config file
  const hsmConnectionOptions = {
    host: config.hsmHost,
    authUsernamePassword: {
      username: config.hsmUsername,
      password: config.hsmPassword,
    },
  };

  // Connects to HSM and returns the connection object
  return hsm.connect(hsmConnectionOptions);
}

/**
 * Disconnects the headless wallet from the HSM.
 * The connection object is a singleton, so it must not be informed as parameter.
 * @returns {Promise<void>}
 */
async function hsmDisconnect() {
  await hsm.disconnect();
  lock.unlock(lockTypes.HSM);
}

/**
 * Checks if the informed HSM key name contains a valid BIP32 xPriv key
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

  // Checks if the key exists on HSM
  let keyInfo;
  try {
    keyInfo = await hsmConnection.blockchain.getKeyInfo(hsmKeyName);
  } catch (e) {
    // Special treatment for a wallet not configured on the HSM
    returnObject.reason = e.errorCode === 5004
      ? `Key does not exist on HSM.`
      : `Unexpected error on key retrieval: ${e.message}`;
    return returnObject;
  }

  // Validates the key type and version
  if (keyInfo.type !== hsm.enums.BLOCKCHAIN_KEYS.BIP32_XPRV) {
    returnObject.reason = `hsm-key is not a valid xPriv.`;
    return returnObject;
  }
  if (!(keyInfo.ver in [
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_TEST_NET,
  ])) {
    returnObject.reason = `hsm-key is not a valid Hathor xPriv.`;
    return returnObject;
  }

  // Returns a positive result for a valid xPriv key
  delete returnObject.reason;
  returnObject.isValidXpriv = true;
  return returnObject;
}

/**
 * Derivates an HTR xPriv key from a given xPriv key up to the Account level.
 * Optionally can derive the Change or Address levels at specific versions.
 * @param {hsm.interfaces.Hsm} hsmConnection
 * @param {string} hsmKeyName
 * @param {Object} [options]
 * @param {boolean} [options.deriveChange] If true, derivation will go until the Change level
 * @param {number} [options.deriveAddressIndex] When informed together with `deriveChange`,
 *                                              also derives the Address level at the
 *                                              requested index
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
    HTR_CKD_ACCOUNT_KEYNAME: 'HTR_ACCOUNT_KEY',
    HTR_CKD_CHANGE_KEYNAME: 'HTR_CHANGE_KEY',
    HTR_CKD_ADDRESS_KEYNAME: 'HTR_ADDRESS_KEY',
  };

  /*
   * Derivation will be made on
   * BIP code / Coin / Account /  Change / Address
   *    m/44' / 280' /      0' /       0 /       0
   *        1 /    2 /      3  /       4 /       5
   */

  // Defining derivation version
  let derivationVersion = options?.version;
  if (!derivationVersion) {
    const config = getConfig();
    if (config.network === 'mainnet') {
      derivationVersion = hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET;
    } else {
      derivationVersion = hsm.enums.VERSION_OPTIONS.BIP32_HTR_TEST_NET;
    }
  }

  // Derivation 1: Bip Code
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion, // Version
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + 44, // Derivation index
    false, // Exportable
    true, // Temporary
    hsmKeyName, // Parent key name
    childKeyNames.HTR_CKD_BIP_KEYNAME, // Child key name
  );

  // Derivation 2: Coin
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion,
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + 280,
    false,
    true,
    childKeyNames.HTR_CKD_BIP_KEYNAME,
    childKeyNames.HTR_CKD_COIN_KEYNAME,
  );

  // Derivation 3: Account
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion,
    hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE,
    false,
    true,
    childKeyNames.HTR_CKD_COIN_KEYNAME,
    childKeyNames.HTR_CKD_ACCOUNT_KEYNAME,
  );

  // If it was not explicitly requested to derive the Change, finish at Account level
  if (!options?.deriveChange) {
    return {
      success: true,
      htrKeyName: childKeyNames.HTR_CKD_ACCOUNT_KEYNAME,
    };
  }

  // Derivation 4: Change
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    derivationVersion,
    0,
    false,
    true,
    childKeyNames.HTR_CKD_ACCOUNT_KEYNAME,
    childKeyNames.HTR_CKD_CHANGE_KEYNAME,
  );

  // If it was not explicitly requested to derive the Address, finish at Change level
  if (!_.isNumber(options?.deriveAddressIndex)) {
    return {
      success: true,
      htrKeyName: childKeyNames.HTR_CKD_CHANGE_KEYNAME,
    };
  }

  // Derivation 5: Address
  // Note: This step is an alternative implementation to `hsmConnection.blockchain.getAddress()`
  const addressKeyName = `${childKeyNames.HTR_CKD_ADDRESS_KEYNAME}_${options.deriveAddressIndex}`;
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    options.deriveAddressIndex,
    true,
    true,
    childKeyNames.HTR_CKD_CHANGE_KEYNAME,
    addressKeyName,
  );

  return {
    success: true,
    htrKeyName: addressKeyName,
  };
}

/**
 * Derivates an HTR wallet xPub string from a given HSM xPriv key
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName
 * @returns {Promise<string>}
 */
async function getXPubFromKey(hsmConnection, hsmKeyName) {
  const { htrKeyName } = await derivateHtrCkd(hsmConnection, hsmKeyName);

  const xPub = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.BIP32_XPUB,
    htrKeyName
  );

  return xPub.toString();
}

/**
 * Sign the given data with the given HSM key
 * @param {hsm.interfaces.Hsm} hsmConnection
 * @param {Buffer} dataToSignHash
 * @param {string} keyName
 * @param {number} addressIndex
 * @returns {Promise<{ pubkey: Buffer, signature: Buffer }>} DER encoded signature and pubkey
 */
async function getSignatureFromData(hsmConnection, dataToSignHash, keyName, addressIndex) {
  // Derive the key to the desired address index
  const { htrKeyName } = await derivateHtrCkd(hsmConnection, keyName, {
    deriveChange: true,
    deriveAddressIndex: addressIndex,
  });

  const signature = await hsmConnection.blockchain.sign(
    hsm.enums.BLOCKCHAIN_SIG_TYPE.SIG_DER_ECDSA,
    hsm.enums.BLOCKCHAIN_HASH_MODE.SHA256,
    dataToSignHash,
    htrKeyName,
  );

  // Dinamo SDK returns v + DER, where v is a parity byte
  // https://manual.dinamonetworks.io/nodejs/enums/hsm.enums.BLOCKCHAIN_SIG_TYPE.html#SIG_DER_ECDSA
  // We can safely ignore the parity byte
  if (signature[0] !== 0x30) {
    return signature.slice(1);
  }
  return signature;
}

/**
 * @typedef {Object} SignatureData
 * @property {Buffer} signature
 * @property {Buffer} pubkey
 * @property {string} address
 * @property {number} index
 */

/**
  * Sign the given transaction with the given HSM key
  * @param {hsm.interfaces.Hsm} hsmConnection
  * @param {hathorLib.HathorWallet} wallet
  * @param {hathorLib.Transaction} tx
  * @param {string} keyName
  *
  * @returns {Promise<SignatureData[]>}
  */
async function getSignatureFromTx(hsmConnection, wallet, tx, keyName) {
  const dataToSignHash = tx.getDataToSignHash();
  /**
   * @type {SignatureData[]}
   */
  const response = [];

  /**
   * @type {{ storage: hathorLib.Storage}}
   */
  const { storage } = wallet;

  for await (const { tx: spentTx, index, input } of storage.getSpentTxs(tx.inputs)) {
    const spentOut = spentTx.outputs[input.index];

    if (!spentOut.decoded.address) {
      // This output is not owned
      continue;
    }
    const addressInfo = await storage.getAddressInfo(spentOut.decoded.address);
    if (!addressInfo) {
      // Not a wallet address
      continue;
    }

    const { pubkey, signature } = await getSignatureFromData(
      hsmConnection,
      dataToSignHash,
      keyName,
      addressInfo.bip32AddressIndex,
    );

    response.push({
      index,
      pubkey,
      signature,
      address: addressInfo.base58,
    });
  }

  return response;
}

/**
 * Sign the given transaction with the given HSM key
 * @param {hsm.interfaces.Hsm} hsmConnection
 * @param {hathorLib.HathorWallet} wallet
 * @param {hathorLib.Transaction} tx
 * @param {string} keyName
 *
 * @returns {Promise<hathorLib.Transaction>}
 */
async function signTxP2PKH(hsmConnection, wallet, tx, keyName) {
  const signatureData = await getSignatureFromTx(hsmConnection, wallet, tx, keyName);
  for (const { index, pubkey, signature } of signatureData) {
    const inputData = hathorLib.transactionUtils.createInputData(
      signature,
      pubkey,
    );
    tx.inputs[index].setData(inputData);
  }
  return tx;
}

module.exports = {
  hsmConnect,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey,
  getSignatureFromTx,
  signTxP2PKH,
};
