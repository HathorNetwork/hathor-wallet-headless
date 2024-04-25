/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const hathorlib = require('@hathor/wallet-lib');
const settings = require('../../settings');
const {
  initializedWallets,
  startWallet,
} = require('../../services/wallets.service');
const { API_ERROR_CODES } = require('../../helpers/constants');
const { getReadonlyWalletConfig } = require('../../helpers/wallet.helper');
const fireblocksService = require('../../services/fireblocks.service');

/**
 * Starts a read-only wallet integrated with fireblocks.
 * The process is similar to the one on the `/start` endpoint.
 * @see src/controllers/index.controller.js , start function
 */
async function startFireblocksWallet(req, res) {
  // Retrieving parameters from request body
  const walletId = req.body['wallet-id'];
  const xpubId = req.body['xpub-id'];

  // Validates input wallet-id
  if (!walletId) {
    res.send({
      success: false,
      message: 'Parameter \'wallet-id\' is required.',
    });
    return;
  }

  // Validates input xpub-id
  if (!xpubId) {
    res.send({
      success: false,
      message: 'Parameter \'xpub-id\' is required.',
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

  // Create the wallet instance
  const config = settings.getConfig();

  // Validate login data for fireblocks.
  if (!(config.fireblocksUrl && config.fireblocksApiKey && config.fireblocksApiSecret)) {
    console.error('Error starting wallet because fireblocks is not configured.');
    res.send({
      success: false,
      message: 'Fireblocks client is not configured.',
    });
    return;
  }

  const xpubMap = config.xpubs || [];
  const xPub = xpubMap[xpubId];

  if (!xPub) {
    console.error('Error starting wallet because xpub-id is referring to a wallet that is not configured.');
    res.send({
      success: false,
      message: `xpub-id ${xpubId} is invalid.`,
    });
    return;
  }

  // Checking that the fireblocks config is valid.
  const fireblocksClient = fireblocksService.startClient();
  try {
    const addressPubkeyInfo = await fireblocksClient.getAddressPubkeyInfo(0);
    const changeXpub = hathorlib.walletUtils.xpubDeriveChild(xPub, 0);
    const localPublicKey = hathorlib.walletUtils.getPublicKeyFromXpub(changeXpub, 0);

    if (addressPubkeyInfo.publicKey !== localPublicKey.toString('hex')) {
      console.error('Fireblocks api public key does not match local public key.');
      res.send({
        success: false,
        message: 'Fireblocks api generated a public key different from local public key.',
      });
      return;
    }
  } catch (error) {
    console.error(`Fireblocks credentials are invalid: ${error.message}`);
    res.status(500).send({
      success: false,
      message: `Could not validate Fireblocks client config, received error: ${error.message}`,
    });
    return;
  }

  // Builds the wallet configuration object
  const walletConfig = getReadonlyWalletConfig({ xpub: xPub });

  try {
    await startWallet(walletId, walletConfig, config, { });

    const wallet = initializedWallets.get(walletId);
    // When signing transactions, the wallet will use this function
    wallet.setExternalTxSigningMethod(fireblocksService.fireblocksSigner);

    res.send({ success: true });
  } catch (error) {
    console.error(error);
    console.error(`Error starting Fireblocks wallet: ${error.message}`);
    res.status(500).send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletId}`,
    });
  }
}

module.exports = {
  startFireblocksWallet,
};
