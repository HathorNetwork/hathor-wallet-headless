/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { patchExpressRouter } = require('../../patch');

const hsmRouter = patchExpressRouter(Router({ mergeParams: true }));
const {
  hsmConnect, hsmDisconnect,
  isKeyValidXpriv
} = require('../../services/hsm.service');
const settings = require('../../settings');

/**
 * Debug route
 * @deprecated
 */
hsmRouter.get('/connect', async (req, res, next) => {
  try {
    await hsmConnect();
    res.send({ success: true });
  } catch (e) {
    res.send({ success: false, error: e.message });
  }
});

/**
 * Debug route
 * @deprecated
 */
hsmRouter.get('/disconnect', async (req, res, next) => {
  try {
    await hsmDisconnect();
    res.send({ success: true });
  } catch (e) {
    res.send({ success: false, error: e.message });
  }
});

hsmRouter.post('/start', async (req, res, next) => {
  const config = settings.getConfig();
  const walletId = req.body['wallet-id'];

  // Validates input parameters
  if (!walletId) {
    res.send({
      success: false,
      message: "Parameter 'wallet-id' is required.",
    });
    return;
  }

  // Validates if the requested id is configured locally
  const hsmKeyName = config.hsmWallets && config.hsmWallets[walletId];
  if (!hsmKeyName) {
    res.send({
      success: false,
      message: `Wallet '${walletId}' is not configured.`,
    });
    return;
  }

  // Validates if the requested id is configured on the HSM
  const connectionObj = await hsmConnect();
  const validationObj = await isKeyValidXpriv(connectionObj, hsmKeyName);
  if (!validationObj.isValidXpriv) {
    res.send({
      success: false,
      message: validationObj.reason,
    });
    return;
  }
  await hsmDisconnect();

  // Starts the wallet
  res.send({
    success: true,
    message: 'Fake starting the wallet',
  });
});

module.exports = hsmRouter;
