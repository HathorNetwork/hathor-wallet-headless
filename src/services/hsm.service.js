/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const { PartialTxInputData, transactionUtils } = require('@hathor/wallet-lib');
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

/**
 * Disconnects the headless wallet from the HSM.
 * The connection object is a singleton, so it must not be informed as parameter.
 * @returns {Promise<void>}
 */
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
 * Derives an address for the wallet at the given index
 * @param {Object} hsmConnection
 * @param {string} hsmKeyName Name of the xPriv key on the HSM
 * @param {number} addressIndex Index to derive the address on
 * @returns {Promise<{
 * pubKey: string,
 * success: boolean,
 * privKey: string,
 * addressIndex: number,
 * addressKeyName: string
 * }>}
 */
async function deriveHtrAddress(hsmConnection, hsmKeyName, addressIndex) {
  const baseWalletKeyName = await derivateHtrCkd(
    hsmConnection,
    hsmKeyName,
    { verbose: true }
  );
  const addressKeyName = `HTR_ADDRESS_KEY_${addressIndex}`;
  await hsmConnection.blockchain.createBip32ChildKeyDerivation(
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    addressIndex,
    true,
    true,
    baseWalletKeyName.htrKeyName,
    addressKeyName,
  );

  // DEBUG: Obtaining the private key and public key to help debugging
  const privKey = await hsmConnection.blockchain.export(
    hsm.enums.IMPORT_EXPORT_FORMAT.SEC1,
    hsm.enums.BLOCKCHAIN_EXPORT_VERSION.WIF_MAIN_NET,
    false,
    addressKeyName
  );
  const pubKey = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.SEC1_COMP,
    addressKeyName
  );
  const hsmAddress = await hsmConnection.blockchain.getAddress(
    hsm.enums.ADDRESS_TYPE.BTC_P2PKH, // Address type
    hsm.enums.ADDRESS_VERSION.HTR_TEST_NET, // Version
    hsm.enums.ADDRESS_HRP.UNUSED, // Human Readable Part
    addressKeyName, // Key name
  );

  return {
    success: true,
    addressIndex,
    address: hsmAddress.toString(),
    addressKeyName,
    pubKey: pubKey.toString('hex'),
    privKey: privKey.toString('hex'),
  };
}

/**
 * Signs a partial tx Proposal with the HSM.
 * @param {Object} hsmConnection The HSM connection object
 * @param {string} hsmKeyName The key containing the xPriv on the HSM
 * @param {PartialTxProposal} proposal A PartialTxProposal already containing the complete proposal
 * @see https://github.com/HathorNetwork/hathor-wallet-lib/blob/1397debc7d49028e09aae08bd86cf02b0145e06b/src/wallet/partialTxProposal.ts#L348-L377
 * @returns {Promise<void>}
 */
async function hsmSignPartialTxProposal(hsmConnection, hsmKeyName, proposal) {
  // Preparing all necessary data to build the signature
  const { partialTx } = proposal;
  const tx = partialTx.getTx();
  const signatureBuildingData = {
    partialTx: partialTx.serialize(),
    txHex: tx.toHex(),
    dataToSign: tx.getDataToSign().toString('hex'),
    hashedDataToSign: tx.getDataToSignHash().toString('hex'),
  };
  console.dir({ signatureBuildingData });

  // Adds the signatures to the tx itself
  await signTransactionInputs(tx, proposal.storage);

  // Builds a Signatures object to inject on the PartialTxProposal
  const signaturesObj = new PartialTxInputData(
    tx.getDataToSign().toString('hex'),
    tx.inputs.length
  );

  // Copy the input data to the Signatures object
  for (const [index, input] of tx.inputs.entries()) {
    if (input.data) {
      // add all signatures we know of this tx
      signaturesObj.addData(index, input.data);
    }
  }

  // Insert the Signatures object into the Proposal and validate its correctness
  console.dir({ signaturesObj });
  proposal.setSignatures(signaturesObj.serialize());

  /**
   * Signs each input of the tx with the HSM.
   * Based on the TransactionUtils.signTransaction function
   * @param {Transaction} _tx
   * @param {Storage} _storage
   * @returns {Promise<void>}
   * @see https://github.com/HathorNetwork/hathor-wallet-lib/blob/d3dbe159ac121eb67986ed8561cdacead8fc9fe8/src/utils/transaction.ts#L126-L151
   */
  async function signTransactionInputs(_tx, _storage) {
    const dataToSignHash = _tx.getDataToSignHash();

    for await (const {
      tx: spentTx,
      input
    } of _storage.getSpentTxs(_tx.inputs)) {
      // Identifying addresses that not belong to this wallet
      const spentOut = spentTx.outputs[input.index];
      if (!spentOut.decoded.address) {
        // This output does not belong to this wallet
        continue;
      }
      const addressInfo = await _storage.getAddressInfo(spentOut.decoded.address);
      if (!addressInfo) {
        // This address does not belong to this wallet
        continue;
      }

      // Deriving the address private and public keys to sign the input
      console.dir({ addressInfo });
      const addressKeyObj = await deriveHtrAddress(
        hsmConnection,
        hsmKeyName,
        addressInfo.bip32AddressIndex,
      );
      const isSamePubKey = addressKeyObj.pubKey === addressInfo.publicKey;
      console.dir({ isSamePubKey, addressKeyObj });

      // Signing the input with the HSM
      const hsmSignature = await hsmConnection.blockchain.sign(
        hsm.enums.BLOCKCHAIN_SIG_TYPE.SIG_DER_RFC_6979_ECDSA, // Signature type
        hsm.enums.BLOCKCHAIN_HASH_MODE.SHA256, // Hash type
        dataToSignHash, // Data to be signed
        addressKeyObj.addressKeyName // Key name
      );
      console.dir({ hexSignature: hsmSignature.toString('hex') });

      // Injecting the signature data back into the tx input object
      const inputData = transactionUtils.createInputData(
        hsmSignature,
        Buffer.from(addressInfo.publicKey) // XXX: Unsure this is the correct way to convert
      );
      input.setData(inputData);
    }
  }
}

module.exports = {
  hsmConnect,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey,
  hsmSignPartialTxProposal,
};
