/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const {
  Connection,
  HathorWallet,
  transactionUtils
} = require('@hathor/wallet-lib');
const { hsm } = require('@dinamonetworks/hsm-dinamo');
// eslint-disable-next-line import/no-extraneous-dependencies
const bitcoreLib = require('bitcore-lib');

const { PrivateKey, PublicKey } = bitcoreLib;
const { patchExpressRouter } = require('../../patch');
const {
  hsmConnect,
  hsmDisconnect,
  isKeyValidXpriv,
  getXPubFromKey
} = require('../../services/hsm.service');
const settings = require('../../settings');
const {
  initializedWallets,
  hardWalletIds
} = require('../../services/wallets.service');
const { WALLET_ALREADY_STARTED } = require('../../helpers/constants');
const { HsmError } = require('../../errors');

const hsmRouter = patchExpressRouter(Router({ mergeParams: true }));

hsmRouter.post('/start', async (req, res, next) => {
  const walletId = req.body['wallet-id'];
  const hsmKeyName = req.body['hsm-key'];

  // Validates input wallet-id
  if (!walletId) {
    res.send({
      success: false,
      message: "Parameter 'wallet-id' is required.",
    });
    return;
  }
  if (initializedWallets.has(walletId)) {
    // We already have a wallet for this key
    // so we log that it won't start a new one because
    // it must first stop the old wallet and then start the new
    console.error('Error starting wallet because this wallet-id is already in use. You must stop the wallet first.');
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletId}`,
      errorCode: WALLET_ALREADY_STARTED,
    });
    return;
  }

  // Validates input hsm-key
  if (!hsmKeyName) {
    res.send({
      success: false,
      message: "Parameter 'hsm-key' is required.",
    });
    return;
  }

  // Connects to the HSM
  let connectionObj;
  try {
    connectionObj = await hsmConnect();
  } catch (e) {
    // Respond with a helpful message for a HsmError
    if (e instanceof HsmError) {
      res.send({
        success: false,
        message: e.message,
      });
      return;
    }
    // Let the global handler deal with this unexpected error
    throw e;
  }

  // Validates if the requested key is configured on the HSM
  const validationObj = await isKeyValidXpriv(connectionObj, hsmKeyName);
  if (!validationObj.isValidXpriv) {
    res.send({
      success: false,
      message: validationObj.reason,
    });
    return;
  }

  const xPub = await getXPubFromKey(connectionObj, hsmKeyName, {
    verbose: true,
    isReadOnlyWallet: true,
  });
  await hsmDisconnect();

  // Creates the wallet
  const config = settings.getConfig();
  const walletConfig = {
    xpub: xPub,
    password: '123',
    pinCode: '123',
    multisig: null,
    connection: null,
  };
  walletConfig.connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });
  console.dir({ hsmXpub: xPub });
  const wallet = new HathorWallet(walletConfig);

  // TODO: Add the other validations such as gap limit and default token

  // Starts the wallet
  wallet.start()
    .then(info => {
      initializedWallets.set(walletId, wallet);
      hardWalletIds.set(walletId, hsmKeyName);
      res.send({
        success: true,
        info,
        message: 'Wallet started',
      });
    })
    .catch(error => {
      console.error(`Error starting HSM wallet: ${error.message}`);
      res.status(500).send({
        success: false,
        message: `Error starting HSM wallet: ${error.message}`,
      });
    });
});

hsmRouter.get('/is-hardware-wallet/:walletId', async (req, res, next) => {
  const { walletId } = req.params;

  // Validates input wallet-id
  if (!walletId) {
    res.send({
      success: false,
      message: "Parameter 'wallet-id' is required.",
    });
    return;
  }

  if (!initializedWallets.has(walletId)) {
    res.send({
      success: false,
      message: `Wallet id ${walletId} not found.`,
    });
    return;
  }

  if (!hardWalletIds.has(walletId)) {
    res.send({
      success: false,
      message: `Wallet id ${walletId} is not a hardware wallet.`,
    });
    return;
  }

  res.send({
    success: true,
    message: `This wallet is a hardware wallet`,
  });
});

/**
 * Debug route to test generating an xPub with each available version code
 */
hsmRouter.post('/test-xpub', async (req, res, next) => {
  const hsmKeyName = req.body['hsm-key'];

  // Validates input hsm-key
  if (!hsmKeyName) {
    res.send({
      success: false,
      message: "Parameter 'hsm-key' is required.",
    });
    return;
  }

  for (const version of [
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    hsm.enums.VERSION_OPTIONS.BIP32_HTR_TEST_NET,
    hsm.enums.VERSION_OPTIONS.BIP32_MAIN_NET,
    hsm.enums.VERSION_OPTIONS.BIP32_TEST_NET,
  ]) {
    const connectionObj = await hsmConnect();
    await getXPubFromKey(connectionObj, hsmKeyName, { version, verbose: true });
    await hsmDisconnect();
  }

  res.send({
    success: true,
    message: 'Check the logs',
  });
});

hsmRouter.post('/test-sign', async (req, res, next) => {
  const hsmKeyName = 'myImportedKey';
  const privateKeyWif = '5J5PZqvCe1uThJ3FZeUUFLCh2FuK9pZhtEK4MzhNmugqTmxCdwE';
  const strDataToSign = '46070d4bf934fb0d4b06d9e2c46e346944e322444900a435d7d9a95e6d7435f5';

  const hsmConnection = await hsmConnect();

  const importedStatus = await hsmConnection.blockchain.import(
    hsm.enums.IMPORT_EXPORT_FORMAT.WIF,
    true, // Exportable
    true, // Temorary
    hsmKeyName, // Key name
    privateKeyWif // Key contents
  );

  // Obtaining the private key and public key from HSM
  const privKey = await hsmConnection.blockchain.export(
    hsm.enums.IMPORT_EXPORT_FORMAT.WIF, // Format
    hsm.enums.BLOCKCHAIN_EXPORT_VERSION.WIF_MAIN_NET, // Version
    true, // Compressed
    hsmKeyName // Key name
  );

  const pubKey = await hsmConnection.blockchain.getPubKey(
    hsm.enums.BLOCKCHAIN_GET_PUB_KEY_TYPE.SEC1_COMP, // Type
    hsmKeyName // Key name
  );

  // Signing the input with the HSM
  const hsmSignature = await hsmConnection.blockchain.sign(
    hsm.enums.BLOCKCHAIN_SIG_TYPE.SIG_DER_RFC_6979_ECDSA, // Signature type
    hsm.enums.BLOCKCHAIN_HASH_MODE.SHA256, // Hash type
    strDataToSign, // Data to be signed
    hsmKeyName // Key name
  );
  await hsmDisconnect();

  // Removing the first byte from the DER signature
  const hsmHexSignature = hsmSignature.toString('hex');
  const hsmCutHexSig = hsmHexSignature.slice(2);

  const hsmData = {
    prvKeyHex: privKey.toString('hex'),
    prvKeyStr: privKey.toString(),
    pubKeyHex: pubKey.toString('hex'),
    hsmCutHexSig,
  };
  console.dir(hsmData);

  // Signing locally with bitcore-lib
  const lclPrivateKey = PrivateKey.fromWIF(privateKeyWif);
  const reWiffed = lclPrivateKey.toWIF();
  const lclPublicKey = new PublicKey(lclPrivateKey);

  // @see https://github.com/bitpay/bitcore/blob/5abaeebca98945769b40a23ec9fa3e3cd36452b0/packages/bitcore-lib/lib/crypto/ecdsa.js#L279
  const ECDSAobj = new bitcoreLib.crypto.ECDSA().set({
    hashbuf: Buffer.from(strDataToSign, 'hex'),
    endian: 'little',
    privkey: lclPrivateKey
  });
  const sigObj = ECDSAobj.sign();
  const lclSignature = sigObj.sig.toDER();

  const ECDSAobjSigHash = new bitcoreLib.crypto.ECDSA().set({
    hashbuf: Buffer.from(strDataToSign, 'hex'),
    endian: 'little',
    privkey: lclPrivateKey,
    nhashtype: bitcoreLib.crypto.Signature.SIGHASH_ALL
  }).sign().sig.toDER();

  const ECDSAobjClean = new bitcoreLib.crypto.ECDSA().set({
    hashbuf: Buffer.from(strDataToSign, 'hex'),
    privkey: lclPrivateKey,
  }).sign().sig.toDER();

  const lclData = {
    privKey: reWiffed.toString(),
    pubKey: lclPublicKey.toString(),
    // lclSign1: ecdsaSignSimple.toDER().toString('hex'),
    lclSignature: lclSignature.toString('hex'),
    lclSigHashSg: ECDSAobjSigHash.toString('hex'),
    lclCleanSign: ECDSAobjClean.toString('hex'),
    sigReference: '3044022078e931e97ab5e801f10772525426dd71b8b435b00c3b88f62c9928bf63176a990220255252aec626a60fda624fa2442b210c171a9ed9a91e3244b7a438751df19707'
  };
  console.dir(lclData, { depth: 3 });

  res.json({ success: true });
});

module.exports = hsmRouter;
