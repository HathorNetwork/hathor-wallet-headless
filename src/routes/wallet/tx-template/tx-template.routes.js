/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { query } = require('express-validator');
const {
  buildTemplate,
  runTemplate,
} = require('../../../controllers/wallet/tx-template/tx-template.controller');
const { patchExpressRouter } = require('../../../patch');
const { validateZodSchema } = require('../../../helpers/validations.helper');
const { TransactionTemplate } = require('@hathor/wallet-lib');

const txTemplateRouter = patchExpressRouter(Router({ mergeParams: true }));

/**
 * GET request to fetch which of the tx inputs are from the wallet.
 * For the docs, see api-docs.js
 */
txTemplateRouter.post(
  '/run',
  validateZodSchema(TransactionTemplate),
  runTemplate,
);

txTemplateRouter.post(
  '/build',
  validateZodSchema(TransactionTemplate),
  query('debug').isBoolean().default(false),
  buildTemplate,
);

module.exports = txTemplateRouter;
