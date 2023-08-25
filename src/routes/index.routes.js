/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { query, checkSchema } = require('express-validator');
const rootControllers = require('../controllers/index.controller');
const { ReadonlyErrorHandler } = require('../middlewares/xpub-error-handler.middleware');
const { txHexSchema } = require('../schemas');

const mainRouter = Router({ mergeParams: true });
const walletRouter = require('./wallet/wallet.routes');

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

mainRouter.get('/config', rootControllers.getConfig);
mainRouter.post('/reload-config', rootControllers.reloadConfig);

mainRouter.use('/wallet', walletRouter);

mainRouter.use(ReadonlyErrorHandler);
mainRouter.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ message: err.message, stack: err.stack });
});

module.exports = mainRouter;
