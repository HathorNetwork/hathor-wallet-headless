import { buildServiceHealthCheck } from '../../helpers/healthcheck.helper';
import { initializedWallets } from '../../services/wallets.service';
import healthService from '../../services/healthcheck.service';

async function getWalletsHealthChecks(
  walletIds,
  includeFullnode = false,
  includeTxMiningService = false
) {
  const promises = Array.from(walletIds).map(
    walletId => healthService.getWalletHealth(initializedWallets.get(walletId), walletId)
  );

  if (includeFullnode) {
    promises.push(healthService.getFullnodeHealth());
  }
  if (includeTxMiningService) {
    promises.push(healthService.getTxMiningServiceHealth());
  }

  const resolvedPromises = await Promise.all(promises);

  const checks = {};

  for (const healthData of resolvedPromises) {
    // We use an array as the value to stick to our current format,
    // which allows us to add more checks to a component if needed
    checks[healthData.componentName] = [healthData];
  }

  const httpStatus = resolvedPromises.every(healthData => healthData.status === 'pass') ? 200 : 503;
  // If any of the checks failed, the status is fail. If all checks passed, the status is pass.
  // Otherwise, the status is warn.
  let status = httpStatus === 200 ? 'pass' : 'warn';
  status = resolvedPromises.some(healthData => healthData.status === 'fail')
    ? 'fail'
    : status;

  return { checks, httpStatus, status };
}

/**
 * Controller for the /health endpoint that returns the health
 * of the wallet-headless service, including all started wallets,
 * the connected fullnode and the tx-mining-service
 */
async function getGlobalHealth(req, res) {
  const sendError = message => {
    res.status(400).send({
      success: false,
      message,
    });
  };

  if (!('x-wallet-ids' in req.headers)) {
    sendError('Header \'X-Wallet-Ids\' is required.');
    return;
  }

  const walletIds = req.headers['x-wallet-ids'].split(',');

  for (const walletId of walletIds) {
    if (!initializedWallets.has(walletId)) {
      sendError(`Invalid wallet id parameter: ${walletId}`);
      return;
    }
  }

  const { checks, httpStatus, status } = await getWalletsHealthChecks(walletIds, true, true);

  const serviceHealth = buildServiceHealthCheck(
    status,
    'Wallet-headless health',
    checks,
  );

  res.status(httpStatus).send(serviceHealth);
}

/**
 * Controller for the /health/wallet endpoint that
 * returns the health of a specific wallet
 */
async function getWalletsHealth(req, res) {
  const sendError = message => {
    res.status(400).send({
      success: false,
      message,
    });
  };

  if (!('x-wallet-ids' in req.headers)) {
    sendError('Header \'X-Wallet-Ids\' is required.');
    return;
  }

  const walletIds = req.headers['x-wallet-ids'].split(',');

  for (const walletId of walletIds) {
    if (!initializedWallets.has(walletId)) {
      sendError(`Invalid wallet id parameter: ${walletId}`);
      return;
    }
  }

  const { checks, httpStatus, status } = await getWalletsHealthChecks(walletIds, true, true);

  const serviceHealth = buildServiceHealthCheck(
    status,
    'Wallet-headless health',
    checks,
  );

  res.status(httpStatus).send(serviceHealth);
}

/**
 * Controller for the /health/fullnode endpoint that
 * returns the health of the connected fullnode
 */
async function getFullnodeHealth(req, res) {
  const fullnodeHealthData = await healthService.getFullnodeHealth();
  const status = fullnodeHealthData.status === 'pass' ? 200 : 503;

  res.status(status).send(fullnodeHealthData);
}

/**
 * Controller for the /health/tx-mining endpoint that
 * returns the health of the connected tx-mining-service
 */
async function getTxMiningServiceHealth(req, res) {
  const txMiningServiceHealthData = await healthService.getTxMiningServiceHealth();
  const status = txMiningServiceHealthData.status === 'pass' ? 200 : 503;

  res.status(status).send(txMiningServiceHealthData);
}

export {
  getGlobalHealth,
  getWalletsHealth,
  getFullnodeHealth,
  getTxMiningServiceHealth
};
