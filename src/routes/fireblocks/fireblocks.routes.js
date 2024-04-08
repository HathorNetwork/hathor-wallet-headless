/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { patchExpressRouter } = require('../../patch');
const { startFireblocksWallet } = require('../../controllers/fireblocks/fireblocks.controller');

const fireblocksRouter = patchExpressRouter(Router({ mergeParams: true }));

fireblocksRouter.post('/start', startFireblocksWallet);

module.exports = fireblocksRouter;
