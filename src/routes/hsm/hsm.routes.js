/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { patchExpressRouter } = require('../../patch');
const { startHsmWallet } = require('../../controllers/hsm/hsm.controller');

const hsmRouter = patchExpressRouter(Router({ mergeParams: true }));

hsmRouter.post('/start', startHsmWallet);

module.exports = hsmRouter;
