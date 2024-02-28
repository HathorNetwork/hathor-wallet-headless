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

function getAcctKeyname(keyname) {
  return `htrAcct_${keyname}`;
}

function getChangeKeyname(keyname) {
  return `htrChange0_${keyname}`;
}

/**
 * @typedef {Object} SignatureData
 * @property {Buffer} signature
 * @property {Buffer} pubkey
 * @property {string} address
 * @property {number} index
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

    /**
     * This unconventional naming is due to the 32 chars keyname restriction,
     * we reserve 17 chars for context of which "Haddr_*_*" uses 7, leaving 10
     * for the address index, this allows us to use all 2 billion indexes
     * without resorting to hex conversion since 2 billion in base 10 has
     * length 10.
     */
    const addressKeyName = `Haddr_${this.rootKey}_${index}`;
    await this.conn.blockchain.createBip32ChildKeyDerivation(
      hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
      index,
      false,
      true,
      getChangeKeyname(),
      addressKeyName,
    );

    this.addressKeys[index] = addressKeyName;
    return addressKeyName;
  }

  /**
   * Get the public key for the given address index.
   * Expected DER encoding of the public key (compressed).
   * @param {number} addressIndex
   * @returns {Promise<Buffer>}
   */
  async getAddressPubkey(addressIndex) {
    const addressKeyName = await this.getAddressKeyName(addressIndex);
    return this.conn.blockchain.getPubKey(
      hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.SEC1_COMP,
      addressKeyName,
    );
  }

  /**
   * Sign the given data with the given HSM key
   * @param {HsmSession} hsmSession
   * @param {Buffer} dataToSignHash
   * @param {number} addressIndex
   * @returns {Promise<Buffer>} DER encoded signature
   */
  async signData(dataToSignHash, addressIndex) {
    // Derive the key to the desired address index
    const htrKeyName = await this.getAddressKeyName(addressIndex);

    const signature = await this.conn.blockchain.sign(
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
   * Sign the given transaction and return the signatures.
   * @param {hathorLib.HathorWallet} wallet
   * @param {hathorLib.Transaction} tx
   * @returns {Promise<SignatureData[]>}
   */
  async signTx(wallet, tx) {
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

      const pubkey = this.getAddressPubkey(addressInfo.bip32AddressIndex);
      const signature = this.signData(dataToSignHash, addressInfo.bip32AddressIndex);

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
   * @param {hathorLib.HathorWallet} wallet
   * @param {hathorLib.Transaction} tx
   *
   * @returns {Promise<hathorLib.Transaction>}
   */
  async signTxP2PKH(wallet, tx) {
    const signatureData = await this.signTx(wallet, tx);
    for (const { index, pubkey, signature } of signatureData) {
      const inputData = hathorLib.transactionUtils.createInputData(
        signature,
        pubkey,
      );
      tx.inputs[index].setData(inputData);
    }
    return tx;
  }
}

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
  } catch (e) {
    // hsm.constants.ERR_CANNOT_OPEN_OBJ = 5004
    if (e.errorCode === hsm.constants.ERR_CANNOT_OPEN_OBJ) {
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
  const acctPathExists = await hsmKeyExists(acctPathKeyname);
  const changePathExists = await hsmKeyExists(changePathKeyname);

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
      false,
      childKeyNames.HTR_CKD_COIN_KEYNAME,
      acctPathKeyname,
    );
  }

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

module.exports = {
  hsmStartSession,
  hsmConnect,
  deriveMainKeysFromRoot,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey,
};
