const { Router } = require('express');
const { patchExpressRouter } = require('../../patch');
const { getGlobalHealth } = require('../../controllers/healthcheck/healthcheck.controller');

const healthcheckRouter = patchExpressRouter(Router({ mergeParams: true }));

/**
 * GET request to get the health of the wallet-headless
 * For the docs, see api-docs.js
 */
healthcheckRouter.get('/', getGlobalHealth);

module.exports = healthcheckRouter;
