/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { query, checkSchema } = require('express-validator');
const rootControllers = require('../controllers/index.controller');
const { txHexSchema } = require('../schemas');
const { patchExpressRouter } = require('../patch');

const mainRouter = patchExpressRouter(Router({ mergeParams: true }));
const walletRouter = require('./wallet/wallet.routes');
const healthcheckRouter = require('./healthcheck/healthcheck.routes');
const hsmRouter = require('./hsm/hsm.routes');
const fireblocksRouter = require('./fireblocks/fireblocks.routes');

mainRouter.get('/', rootControllers.welcome);
mainRouter.get('/docs', rootControllers.docs);
mainRouter.post('/start', rootControllers.start);
mainRouter.post('/multisig-pubkey', rootControllers.multisigPubkey);
mainRouter.post(
  '/push-tx',
  checkSchema(txHexSchema),
  rootControllers.pushTxHex,
);

/**
 * GET request to get the configuration string of a token
 * For the docs, see api-docs.js
 */
mainRouter.get(
  '/configuration-string',
  query('token').isString(),
  rootControllers.getConfigurationString
);

mainRouter.post('/reload-config', rootControllers.reloadConfig);

mainRouter.use('/wallet', walletRouter);
mainRouter.use('/hsm', hsmRouter);
mainRouter.use('/fireblocks', fireblocksRouter);

mainRouter.use('/health', healthcheckRouter);

module.exports = mainRouter;
