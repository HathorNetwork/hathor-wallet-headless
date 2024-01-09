/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { body } = require('express-validator');
const { patchExpressRouter } = require('../../../patch');
const {
  getLastLoadedAddressIndex,
  indexLimitLoadMoreAddresses,
  indexLimitSetEndIndex,
} = require('../../../controllers/wallet/config/config.controller');

const configRouter = patchExpressRouter(Router({ mergeParams: true }));

configRouter.get(
  '/last-loaded-address-index',
  getLastLoadedAddressIndex,
);

configRouter.post(
  '/index-limit/load-more-addresses',
  body('count').isInt({ min: 1 }).toInt(),
  indexLimitLoadMoreAddresses,
);

configRouter.post(
  '/index-limit/last-index',
  body('index').isInt({ min: 0 }).toInt(),
  indexLimitSetEndIndex,
);

module.exports = configRouter;
