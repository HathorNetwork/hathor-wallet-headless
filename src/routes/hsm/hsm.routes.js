/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { patchExpressRouter } = require('../../patch');
const { startHsmWallet, simpleSendTx, proposeSimpleTx } = require('../../controllers/hsm/hsm.controller');
const { walletMiddleware } = require('../../middlewares/wallet.middleware');

const hsmRouter = patchExpressRouter(Router({ mergeParams: true }));

hsmRouter.post('/start', startHsmWallet);

hsmRouter.use(walletMiddleware);
hsmRouter.post('/simple-send-tx', simpleSendTx);
hsmRouter.post('/propose-simple-tx', proposeSimpleTx);

module.exports = hsmRouter;
