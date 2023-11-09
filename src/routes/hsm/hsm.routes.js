/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const {
  Connection,
  HathorWallet
} = require('@hathor/wallet-lib');
const { hsm } = require('@dinamonetworks/hsm-dinamo');
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

module.exports = hsmRouter;
