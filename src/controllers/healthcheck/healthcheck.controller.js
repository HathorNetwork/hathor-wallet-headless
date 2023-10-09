import { buildServiceHealthCheck } from '../../helpers/healthcheck.helper';
import { initializedWallets } from '../../services/wallets.service';
import healthService from '../../services/healthcheck.service';

async function getGlobalHealth(req, res) {
  const promises = [];

  for (const [walletId, wallet] of initializedWallets) {
    promises.push(healthService.getWalletHealth(wallet, walletId));
  }

  promises.push(healthService.getFullnodeHealth());
  promises.push(healthService.getTxMiningServiceHealth());

  // Use Promise.all to run all checks in parallel and replace the promises with the results
  const resolvedPromises = await Promise.all(promises);

  let httpStatus = 200;
  let status = 'pass';

  for (const healthData of resolvedPromises) {
    if (healthData.status === 'fail') {
      httpStatus = 503;
      status = 'fail';
      break;
    }

    if (healthData.status === 'warn') {
      httpStatus = 503;
      status = 'warn';
    }
  }

  const checks = {};

  for (const healthData of resolvedPromises) {
    // We use an array as the value to stick to our current format,
    // which allows us to add more checks to a component if needed
    checks[healthData.componentName] = [healthData];
  }

  const serviceHealth = buildServiceHealthCheck(
    status,
    'Wallet-headless health',
    checks,
  );

  res.status(httpStatus).send(serviceHealth);
}

async function getWalletHealth(req, res) {
  const sendError = message => {
    res.status(400).send({
      success: false,
      message,
    });
  };

  if (!('x-wallet-id' in req.headers)) {
    sendError('Header \'X-Wallet-Id\' is required.');
    return;
  }

  const walletId = req.headers['x-wallet-id'];
  if (!initializedWallets.has(walletId)) {
    sendError('Invalid wallet id parameter.');
    return;
  }
  const wallet = initializedWallets.get(walletId);
  const walletHealthData = await healthService.getWalletHealth(wallet, walletId);

  const status = walletHealthData.status === 'pass' ? 200 : 503;

  res.status(status).send(walletHealthData);
}

async function getFullnodeHealth(req, res) {
  const fullnodeHealthData = await healthService.getFullnodeHealth();
  const status = fullnodeHealthData.status === 'pass' ? 200 : 503;

  res.status(status).send(fullnodeHealthData);
}

async function getTxMiningServiceHealth(req, res) {
  const txMiningServiceHealthData = await healthService.getTxMiningServiceHealth();
  const status = txMiningServiceHealthData.status === 'pass' ? 200 : 503;

  res.status(status).send(txMiningServiceHealthData);
}

export {
  getGlobalHealth,
  getWalletHealth,
  getFullnodeHealth,
  getTxMiningServiceHealth
};
