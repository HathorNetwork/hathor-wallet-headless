import { config as hathorLibConfig, healthApi, txMiningApi } from '@hathor/wallet-lib';

const { buildComponentHealthCheck } = require('../helpers/healthcheck.helper');
const { friendlyWalletState } = require('../helpers/constants');

const healthService = {
  /**
   * Returns the health object for a specific wallet
   *
   * @param {HathorWallet} wallet
   * @param {string} walletId
   * @returns {Object}
   */
  async getWalletHealth(wallet, walletId) {
    let healthData;

    if (!wallet.isReady()) {
      healthData = buildComponentHealthCheck(
        `Wallet ${walletId}`,
        'fail',
        'internal',
        `Wallet is not ready. Current state: ${friendlyWalletState[wallet.state]}`
      );
    } else {
      healthData = buildComponentHealthCheck(
        `Wallet ${walletId}`,
        'pass',
        'internal',
        'Wallet is ready'
      );
    }

    return healthData;
  },

  /**
   * Returns the health object for the connected fullnode
   *
   * @returns {Object}
   */
  async getFullnodeHealth() {
    let output;
    let healthStatus;

    // TODO: We will need to parse the healthData to get the status,
    // but hathor-core hasn't this implemented yet
    try {
      await healthApi.getHealth();

      output = 'Fullnode is responding';
      healthStatus = 'pass';
    } catch (e) {
      if (e.response && e.response.data) {
        output = `Fullnode reported as unhealthy: ${JSON.stringify(e.response.data)}`;
        healthStatus = e.response.data.status;
      } else {
        output = `Error getting fullnode health: ${e.message}`;
        healthStatus = 'fail';
      }
    }

    const fullnodeHealthData = buildComponentHealthCheck(
      `Fullnode ${hathorLibConfig.getServerUrl()}`,
      healthStatus,
      'fullnode',
      output
    );

    return fullnodeHealthData;
  },

  /**
   * Returns the health object for the connected tx-mining-service
   *
   * @returns {Object}
   */
  async getTxMiningServiceHealth() {
    let output;
    let healthStatus;

    try {
      const healthData = await txMiningApi.getHealth();

      healthStatus = healthData.status;

      if (healthStatus === 'fail') {
        output = `Tx Mining Service reported as unhealthy: ${JSON.stringify(healthData)}`;
      } else {
        output = 'Tx Mining Service is healthy';
      }
    } catch (e) {
      if (e.response && e.response.data) {
        output = `Tx Mining Service reported as unhealthy: ${JSON.stringify(e.response.data)}`;
        healthStatus = e.response.data.status;
      } else {
        output = `Error getting tx-mining-service health: ${e.message}`;
        healthStatus = 'fail';
      }
    }

    const txMiningServiceHealthData = buildComponentHealthCheck(
      `TxMiningService ${hathorLibConfig.getTxMiningUrl()}`,
      healthStatus,
      'service',
      output
    );

    return txMiningServiceHealthData;
  }
};

export default healthService;
