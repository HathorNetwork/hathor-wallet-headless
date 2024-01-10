import { initializedWallets } from '../../services/wallets.service';
import HealthService from '../../services/healthcheck.service';
import { parametersValidation } from '../../helpers/validations.helper';

/**
 * Controller for the /health endpoint that returns the health
 * of the wallet-headless service, including all started wallets,
 * the connected fullnode and the tx-mining-service
 */
async function getGlobalHealth(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const sendError = message => {
    res.status(400).send({
      success: false,
      message,
    });
  };

  let walletIds = [];

  if ('wallet_ids' in req.query) {
    walletIds = req.query.wallet_ids.split(',');
  }

  const includeFullnode = req.query.include_fullnode === 'true';
  const includeTxMiningService = req.query.include_tx_mining === 'true';

  // Check whether at least one component is included
  if (!includeFullnode && !includeTxMiningService && walletIds.length === 0) {
    sendError('At least one component must be included in the health check');
    return;
  }

  for (const walletId of walletIds) {
    if (!initializedWallets.has(walletId)) {
      sendError(`Invalid wallet id parameter: ${walletId}`);
      return;
    }
  }

  const healthService = new HealthService(walletIds, includeFullnode, includeTxMiningService);
  const healthStatus = await healthService.getHealth();

  res.status(healthStatus.getHttpStatusCode()).send(JSON.parse(healthStatus.toJson()));
}

export {
  getGlobalHealth,
};
