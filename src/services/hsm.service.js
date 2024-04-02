/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const hathorLib = require('@hathor/wallet-lib');

const { getConfig } = require('../settings');
const { lock, lockTypes } = require('../lock');
const { hsmBusyErrorMessage } = require('../helpers/constants');
const { HsmError } = require('../errors');

/* istanbul ignore next */
/**
 * After an error, the HSM lib has a runtime issue that will fail the next call
 * To avoid this we can wait 500ms before continuing.
 * This may be fixed in the near future.
 * This method will return a promise that resolves after the given ms
 * @param {number} ms
 * @returns {Promise<void>}
 */
async function delay(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the bip32 keyname
 * @param {string} keyname
 * @param {number} pathIndex
 * @param {Object} [options={}]
 * @param {number} options.index Derivation index for address level
 */
function getBip32Keyname(keyname, pathIndex, options = {}) {
  const levels = [
    keyname, // Root level
    `${keyname}_bip44`,
    `${keyname}_coinHTR`,
    `${keyname}_htrAcct`,
    `${keyname}_htrChange0`,
  ];
  if (pathIndex >= levels.length) {
    // Address index derivation
    /**
     * This unconventional naming is due to the 32 chars keyname restriction,
     * we reserve 17 chars for context of which "*_HAddr_*" uses 7, leaving 10
     * for the address index, this allows us to use all 2 billion indexes
     * without resorting to hex conversion since 2 billion in base 10 has
     * length 10.
     */
    return `${keyname}_HAddr_${options.index}`;
  }

  return levels[pathIndex];
}

function getAcctKeyname(keyname) {
  return getBip32Keyname(keyname, 3);
}

function getChangeKeyname(keyname) {
  return getBip32Keyname(keyname, 4);
}

/**
 * @typedef {Object} InputSignatureData
 * @property {Buffer} signature
 * @property {Buffer} pubkey
 * @property {number} addressIndex
 * @property {number} inputIndex
 */

/**
 * @typedef {Object} SignatureData
 * @property {Buffer|null} ncCallerSignature
 * @property {InputSignatureData[]} inputSignatures
 */

class HsmSession {
  /**
   * @param {hsm.interfaces.Hsm} conn
   * @param {string} rootKeyname
   */
  constructor(conn, rootKeyname) {
    this.conn = conn;
    this.rootKey = rootKeyname;
    /**
     * @type {Record<number, string>}
     */
    this.addressKeys = {};
  }

  /**
   * Get the adddress index keyname from the address index
   * @param {index} index - bip32 Address index
   * @returns {Promise<string>}
   */
  async getAddressKeyName(index) {
    if (index in this.addressKeys) {
      return this.addressKeys[index];
    }

    const config = getConfig();
    let derivationVersion;
    if (config.network === 'mainnet') {
      derivationVersion = hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET;
    } else {
      derivationVersion = hsm.enums.VERSION_OPTIONS.BIP32_HTR_TEST_NET;
    }

    const addressKeyName = getBip32Keyname(this.rootKey, 5, { index });
    const changeKeyName = getChangeKeyname(this.rootKey);
    try {
      await this.conn.blockchain.createBip32ChildKeyDerivation(
        derivationVersion, // network version byte
        index, // Derivation index
        false, // exportable
        true, // temporary
        changeKeyName,
        addressKeyName,
      );
    } catch (err) /* istanbul ignore next */ {
      // After an error, the HSM lib has a runtime issue that will fail the next call
      // To avoid this we can wait 500ms before continuing.
      // TODO: Check if this is fixed
      await delay(500);
      // (CODE: 5022 | NAME: ERR_OBJ_ALREADY_EXISTS)
      // This error code means the address key was already derived
      if (err.errorCode === hsm.constants.ERR_OBJ_ALREADY_EXISTS) {
        // address key already exists, just return it
        this.addressKeys[index] = addressKeyName;
        return addressKeyName;
      }
      console.error(err);
      throw err;
    }

    this.addressKeys[index] = addressKeyName;
    return addressKeyName;
  }

  /**
   * Get the signature for the given data with the given HSM key
   * @param {Buffer} dataToSignHash
   * @param {number} addressIndex
   * @returns {Promise<Buffer>} DER encoded signature
   */
  async getSignature(dataToSignHash, addressIndex) {
    // Derive the key to the desired address index
    const htrKeyName = await this.getAddressKeyName(addressIndex);

    // This api receives the pre-hashed data to sign
    // We request a non-deterministic ECDSA signature
    // and it returns the DER encoded signature Buffer
    const signature = await this.conn.blockchain.sign(
      hsm.enums.BLOCKCHAIN_SIG_TYPE.SIG_DER_ECDSA,
      hsm.enums.BLOCKCHAIN_HASH_MODE.SHA256,
      dataToSignHash,
      htrKeyName,
    );

    // Dinamo SDK returns v + DER, where v is a parity byte
    // https://manual.dinamonetworks.io/nodejs/enums/hsm.enums.BLOCKCHAIN_SIG_TYPE.html#SIG_DER_ECDSA
    // We can safely ignore the parity byte
    // In DER encoding 0x30 is a tag for sequence and since an ECDSA signature
    // is the [r, s] array the first byte in DER encoding should be 0x30
    if (signature[0] !== 0x30) {
      return signature.slice(1);
    }
    return signature;
  }

  /**
   * Sign the given transaction and return the signatures.
   * @param {hathorLib.Transaction} tx
   * @param {hathorLib.Storage} storage
   * @returns {Promise<SignatureData>}
   */
  async signTx(tx, storage) {
    const dataToSignHash = tx.getDataToSignHash();
    /**
   * @type {InputSignatureData[]}
   */
    const inputSignatures = [];
    let ncCallerSignature = null;

    for await (const { tx: spentTx, input, index: inputIndex } of storage.getSpentTxs(tx.inputs)) {
      if (input.data) {
        // This input is already signed
        continue;
      }

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

      const pubkeyHex = await storage.getAddressPubkey(addressInfo.bip32AddressIndex);
      const pubkey = Buffer.from(pubkeyHex, 'hex');
      const signature = await this.getSignature(dataToSignHash, addressInfo.bip32AddressIndex);

      inputSignatures.push({
        inputIndex,
        addressIndex: addressInfo.bip32AddressIndex,
        signature,
        pubkey,
      });
    }

    /* istanbul ignore next */
    if (tx.version === hathorLib.constants.NANO_CONTRACTS_VERSION) {
      const { pubkey } = tx;
      const address = hathorLib.addressUtils.getAddressFromPubkey(pubkey.toString('hex'), storage.config.getNetwork());
      const addressInfo = await storage.getAddressInfo(address.base58);
      if (!addressInfo) {
        // Not a wallet address
        return { inputSignatures };
      }
      // Sign the transaction for the caller
      ncCallerSignature = await this.getSignature(dataToSignHash, addressInfo.bip32AddressIndex);
    }

    return { inputSignatures, ncCallerSignature };
  }
}

/**
 * Starts a new HSM session
 * @param {string} rootKeyname
 * @returns {Promise<HsmSession>}
 */
async function hsmStartSession(rootKeyname) {
  const hsmConnection = await hsmConnect();
  return new HsmSession(hsmConnection, rootKeyname);
}

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
 * Check that a key exists
 * @param {hsm.interfaces.Hsm} hsmConnection
 * @param {string} keyname
 * @returns {Promise<boolean>}
 */
async function hsmKeyExists(hsmConnection, keyname) {
  try {
    await hsmConnection.blockchain.getKeyInfo(keyname);
    return true;
  } catch (e) /* istanbul ignore next */ {
    // hsm.constants.ERR_CANNOT_OPEN_OBJ = 5004
    if (e.errorCode === hsm.constants.ERR_CANNOT_OPEN_OBJ) {
      // After an error, the HSM lib has a runtime issue that will fail the next call
      // To avoid this we can wait 500ms before continuing.
      // TODO: Check if this is fixed
      await delay(500);
      return false;
    }
    // Some other error happened
    throw e;
  }
}

/**
 * Create the account or change path keys if they don't already exist.
 * Derivates an HTR xPriv key from a given xPriv key up to the Account level.
 * Optionally can derive the Change or Address levels at specific versions.
 * @param {hsm.interfaces.Hsm} hsmConnection
 * @param {string} hsmKeyName
 * @param {Object} [options]
 * @param {boolean} [options.deriveChange] If true, derivation will go until the Change level
 * @param {number|null} [version=null] XPriv version, will try to use the correct from the network
 * @returns {Promise<{success: boolean, htrKeyName: string}>}
 */
async function deriveMainKeysFromRoot(
  hsmConnection,
  hsmKeyName,
  version = null,
) {
  const acctPathKeyname = getAcctKeyname(hsmKeyName);
  const changePathKeyname = getChangeKeyname(hsmKeyName);

  // Checks if the account path key exists on HSM
  const acctPathExists = await hsmKeyExists(hsmConnection, acctPathKeyname);

  // Defining derivation version
  let derivationVersion = version;
  if (!derivationVersion) {
    const config = getConfig();
    if (config.network === 'mainnet') {
      derivationVersion = hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET;
    } else {
      derivationVersion = hsm.enums.VERSION_OPTIONS.BIP32_HTR_TEST_NET;
    }
  }

  if (!acctPathExists) {
    // derive from root to account path
    const childKeyNames = {
      HTR_CKD_BIP_KEYNAME: 'HTR_BIP_KEY',
      HTR_CKD_COIN_KEYNAME: 'HTR_COIN_KEY',
    };

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
      hsm.enums.BCHAIN_SECURE_BIP32_INDEX.BASE + hathorLib.constants.HATHOR_BIP44_CODE,
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
      false,
      childKeyNames.HTR_CKD_COIN_KEYNAME,
      acctPathKeyname,
    );
  }

  const changePathExists = await hsmKeyExists(hsmConnection, changePathKeyname);
  if (!changePathExists) {
    // derive from account path to change path 0
    // Derivation 3: Account
    await hsmConnection.blockchain.createBip32ChildKeyDerivation(
      derivationVersion,
      0,
      false,
      false,
      acctPathKeyname,
      changePathKeyname,
    );
  }
}

/**
 * Derivates an HTR wallet xPub string from a given HSM xPriv key
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName
 * @returns {Promise<string>}
 */
async function getXPubFromKey(hsmConnection, hsmKeyName) {
  // account path should already be derived when this is called
  const htrKeyName = getAcctKeyname(hsmKeyName);

  const xPub = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.BIP32_XPUB,
    htrKeyName
  );

  return xPub.toString();
}

/**
 * HSM Sign transaction method builder
 * The custom method returned by this builder will
 * be used to sign transactions by the wallet facade.
 *
 * @param {string} hsmKeyName
 * @returns {EcdsaTxSign}
 */
function hsmSignTxMethodBuilder(hsmKeyName) {
  return async (tx, storage, pinCode) => {
    // Start HSM session
    const hsmSession = await hsmStartSession(hsmKeyName);
    // Sign the transaction and get the signatures
    const signatureData = await hsmSession.signTx(tx, storage, pinCode);
    // Close session
    await hsmDisconnect();

    return signatureData;
  };
}

module.exports = {
  hsmStartSession,
  hsmConnect,
  deriveMainKeysFromRoot,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey,
  hsmSignTxMethodBuilder,
};
