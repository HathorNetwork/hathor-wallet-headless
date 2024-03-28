/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const settings = require('../../settings');
const {
  initializedWallets,
  startWallet,
} = require('../../services/wallets.service');
const { API_ERROR_CODES } = require('../../helpers/constants');
const hsmService = require('../../services/hsm.service');
const { HsmError } = require('../../errors');
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
  /**
   * @type {hsm.interfaces.Hsm}
   */
  let connectionObj;
  try {
    connectionObj = await hsmService.hsmConnect();
  } catch (e) {
    console.error(e);
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
    await hsmService.deriveMainKeysFromRoot(connectionObj, hsmKeyName);
    xPub = await hsmService.getXPubFromKey(connectionObj, hsmKeyName);
  } catch (e) {
    console.error(e);
    res.send({
      success: false,
      message: `Unexpected error on HSM xPub derivation: ${e.message}`,
    });
    await hsmService.hsmDisconnect();
    return;
  }
  await hsmService.hsmDisconnect();

  // Builds the wallet configuration object
  const walletConfig = getReadonlyWalletConfig({ xpub: xPub });

  // Create the wallet instance
  const config = settings.getConfig();

  try {
    await startWallet(walletId, walletConfig, config, { hsmKeyName });

    const wallet = initializedWallets.get(walletId);
    // When signing transactions, the wallet will use this function
    wallet.setExternalTxSigningMethod(hsmService.hsmSignTxMethodBuilder(hsmKeyName));

    res.send({ success: true });
  } catch (error) {
    console.error(`Error starting HSM wallet: ${error.message}`);
    res.status(500).send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletId} and key ${hsmKeyName}`,
    });
  }
}

module.exports = {
  startHsmWallet,
};
