/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const rootControllers = require('../controllers/index.controller');

const mainRouter = Router({ mergeParams: true });
const walletRouter = require('./wallet.routes');

mainRouter.get('/', rootControllers.welcome);
mainRouter.get('/docs', rootControllers.docs);
mainRouter.post('/start', rootControllers.start);
mainRouter.post('/multisig-pubkey', rootControllers.multisigPubkey);
mainRouter.use('/wallet', walletRouter);

mainRouter.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ message: err.message, stack: err.stack });
});

module.exports = mainRouter;
