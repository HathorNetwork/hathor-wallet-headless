/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { query, checkSchema, oneOf, body } = require('express-validator');
const {
  getState, getHistory, createNanoContract, executeNanoContractMethod
} = require('../../controllers/wallet/nano-contracts.controller');
const { patchExpressRouter } = require('../../patch');

const nanoContractRouter = patchExpressRouter(Router({ mergeParams: true }));

/**
 * GET request to get the state of a nano
 * For the docs, see api-docs.js
 */
nanoContractRouter.get(
  '/state',
  query('id').isString(),
  query('fields').isArray().optional().default([]),
  query('balances').isArray().optional().default([]),
  query('calls').isArray().optional().default([]),
  getState
);

/**
 * GET request to get the history of a nano
 * For the docs, see api-docs.js
 */
nanoContractRouter.get(
  '/history',
  query('id').isString(),
  query('count').isInt({ min: 0 }).optional().toInt(),
  query('after').isString().optional(),
  getHistory
);

/**
 * POST request to create a nano contract
 * For the docs, see api-docs.js
 */
nanoContractRouter.post(
  '/create',
  body('blueprint').isString(),
  body('address').isString(),
  body('data').isObject(),
  createNanoContract,
);

/**
 * POST request to execute a method of a nano contract
 * For the docs, see api-docs.js
 */
nanoContractRouter.post(
  '/execute',
  body('blueprint').isString(),
  body('method').isString(),
  body('address').isString(),
  body('data').isObject(),
  executeNanoContractMethod,
);

module.exports = nanoContractRouter;
