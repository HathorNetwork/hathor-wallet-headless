const { Router } = require('express');
const { patchExpressRouter } = require('../../patch');
const { getWalletsHealth, getFullnodeHealth, getTxMiningServiceHealth, getGlobalHealth } = require('../../controllers/healthcheck/healthcheck.controller');

const healthcheckRouter = patchExpressRouter(Router({ mergeParams: true }));

/**
 * GET request to get the health of the wallet-headless
 * For the docs, see api-docs.js
 */
healthcheckRouter.get('/', getGlobalHealth);

/**
 * GET request to get the health of a wallet
 * For the docs, see api-docs.js
 */
healthcheckRouter.get('/wallets', getWalletsHealth);

/**
 * GET request to get the health of the fullnode
 * For the docs, see api-docs.js
 */
healthcheckRouter.get('/fullnode', getFullnodeHealth);

/**
 * GET request to get the health of the tx-mining-service
 * For the docs, see api-docs.js
 */
healthcheckRouter.get('/tx-mining', getTxMiningServiceHealth);

module.exports = healthcheckRouter;
