const { Router } = require('express');
const { query } = require('express-validator');
const { patchExpressRouter } = require('../../patch');
const { getGlobalHealth } = require('../../controllers/healthcheck/healthcheck.controller');

const healthcheckRouter = patchExpressRouter(Router({ mergeParams: true }));

/**
 * GET request to get the health of the wallet-headless
 * For the docs, see api-docs.js
 */
healthcheckRouter.get(
  '/',
  query('wallet_ids').isString().optional(),
  query('include_fullnode').isBoolean().optional(),
  query('include_tx_mining').isBoolean().optional(),
  getGlobalHealth
);

module.exports = healthcheckRouter;
