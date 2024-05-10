/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { body } = require('express-validator');
const { patchExpressRouter } = require('../../patch');
const { startFireblocksWallet } = require('../../controllers/fireblocks/fireblocks.controller');

const fireblocksRouter = patchExpressRouter(Router({ mergeParams: true }));

fireblocksRouter.post(
  '/start',
  body('wallet-id').isString(),
  body('xpub').isString(),
  startFireblocksWallet,
);

module.exports = fireblocksRouter;
