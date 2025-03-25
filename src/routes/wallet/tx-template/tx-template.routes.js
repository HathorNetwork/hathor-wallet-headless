/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { query } = require('express-validator');
const { TransactionTemplate } = require('@hathor/wallet-lib');
const {
  buildTemplate,
  runTemplate,
} = require('../../../controllers/wallet/tx-template/tx-template.controller');
const { patchExpressRouter } = require('../../../patch');
const { validateZodSchema } = require('../../../helpers/validations.helper');

const txTemplateRouter = patchExpressRouter(Router({ mergeParams: true }));

/**
 * POST request to build and run a transaction template.
 */
txTemplateRouter.post(
  '/run',
  validateZodSchema(TransactionTemplate),
  query('debug').default(false).isBoolean().toBoolean(),
  runTemplate,
);

/**
 * POST request to build a transaction from the template.
 */
txTemplateRouter.post(
  '/build',
  validateZodSchema(TransactionTemplate),
  query('debug').default(false).isBoolean().toBoolean(),
  query('sign').default(false).isBoolean().toBoolean(),
  buildTemplate,
);

module.exports = txTemplateRouter;
