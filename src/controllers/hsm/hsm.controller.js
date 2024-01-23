/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  Connection,
  HathorWallet
} = require('@hathor/wallet-lib');
const {
  initializedWallets,
  hardWalletIds
} = require('../../services/wallets.service');
const { API_ERROR_CODES } = require('../../helpers/constants');
const hsmService = require('../../services/hsm.service');
const { HsmError } = require('../../errors');
const settings = require('../../settings');
const { notificationBus } = require('../../services/notification.service');
const { getReadonlyWalletConfig } = require('../../helpers/wallet.helper');

/**
 * Starts a read-only wallet integrated with the HSM.
 * The process is similar to the one on the `/start` endpoint.
 * @see src/controllers/index.controller.js , start function
 */
async function startHsmWallet(req, res) {
  // Retrieving parameters from request body
  const walletId = req.body['wallet-id'];
  const hsmKeyName = req.body['hsm-key'];

  // Validates input wallet-id
  if (!walletId) {
    res.send({
      success: false,
      message: 'Parameter \'wallet-id\' is required.',
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
      errorCode: API_ERROR_CODES.WALLET_ALREADY_STARTED,
    });
    return;
  }

  // Validates input hsm-key
  if (!hsmKeyName) {
    res.send({
      success: false,
      message: 'Parameter \'hsm-key\' is required.',
    });
    return;
  }

  // Connects to the HSM
  let connectionObj;
  try {
    connectionObj = await hsmService.hsmConnect();
  } catch (e) {
    const responseObj = {
      success: false,
      message: `Unexpected error on HSM connection: ${e.message}`,
    };

    // If this is a HsmError, the error message was already treated
    // and there should be no attempt to disconnect from the HSM,
    // since it's still being used by another request.
    if (e instanceof HsmError) {
      responseObj.message = e.message;
      res.send(responseObj);
      return;
    }

    // Send error message and disconnect from the HSM
    res.send(responseObj);
    await hsmService.hsmDisconnect();
    return;
  }

  // Validates if the requested key is a valid BIP32 xPriv on the HSM
  const validationObj = await hsmService.isKeyValidXpriv(connectionObj, hsmKeyName);
  if (!validationObj.isValidXpriv) {
    res.send({
      success: false,
      message: validationObj.reason,
    });
    await hsmService.hsmDisconnect();
    return;
  }

  // Obtains this wallet's xPub from the HSM
  let xPub = null;
  try {
    xPub = await hsmService.getXPubFromKey(connectionObj, hsmKeyName, {
      isReadOnlyWallet: true,
    });
  } catch (e) {
    res.send({
      success: false,
      message: `Unexpected error on HSM xPub derivation: ${e.message}`,
    });
    await hsmService.hsmDisconnect();
    return;
  }
  await hsmService.hsmDisconnect();

  // Builds the wallet configuration object
  const config = settings.getConfig();
  const walletConfig = getReadonlyWalletConfig({ xpub: xPub });
  walletConfig.connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });

  // tokenUid is optional but if not passed as parameter the wallet will use HTR
  if (config.tokenUid) {
    walletConfig.tokenUid = config.tokenUid;
  }

  // Actually creats the wallet instance
  const wallet = new HathorWallet(walletConfig);

  if (config.gapLimit) {
    // XXX: The gap limit is now a per-wallet configuration
    // To keep the same behavior as before, we set the gap limit
    // when creating the wallet, but we should move this to the
    // wallet configuration in the future
    await wallet.setGapLimit(config.gapLimit);
  }

  // Subscribe to wallet events with notificationBus
  notificationBus.subscribeHathorWallet(walletId, wallet);

  // Starts the wallet
  wallet.start()
    .then(info => {
      initializedWallets.set(walletId, wallet);
      hardWalletIds.set(walletId, hsmKeyName);
      res.send({
        success: true,
      });
    })
    .catch(error => {
      console.error(`Error starting HSM wallet: ${error.message}`);
      res.status(500)
        .send({
          success: false,
          message: `Failed to start wallet with wallet id ${walletId} and key ${hsmKeyName}`,
        });
    });
}

module.exports = {
  startHsmWallet,
};
