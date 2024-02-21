import { healthApi, txMiningApi, config as hathorLibConfig } from '@hathor/wallet-lib';
import { Healthcheck, HealthcheckInternalComponent, HealthcheckHTTPComponent, HealthcheckCallbackResponse, HealthcheckStatus } from '@hathor/healthcheck-lib';
import { initializedWallets } from './wallets.service';
import { getConfig } from '../settings';

const { friendlyWalletState } = require('../helpers/constants');

class HealthService {
  constructor(walletIds, includeFullnode, includeTxMiningService) {
    const config = getConfig();

    this.healthcheck = new Healthcheck({
      name: 'hathor-wallet-headless',
      warn_is_unhealthy: config.considerHealthcheckWarnAsUnhealthy,
    });

    this.initializeWalletComponents(walletIds);

    if (includeFullnode) {
      this.initializeFullnodeComponent();
    }

    if (includeTxMiningService) {
      this.initializeTxMiningServiceComponent();
    }
  }

  initializeWalletComponents(walletIds) {
    for (const walletId of walletIds) {
      if (!initializedWallets.has(walletId)) {
        throw new Error(`Invalid wallet id parameter: ${walletId}`);
      }

      const component = new HealthcheckInternalComponent({
        name: `Wallet ${walletId}`,
        id: walletId,
      });

      component.add_healthcheck(
        async () => HealthService.getWalletHealth(initializedWallets.get(walletId))
      );
      this.healthcheck.add_component(component);
    }
  }

  initializeFullnodeComponent() {
    const serverUrl = hathorLibConfig.getServerUrl();

    const component = new HealthcheckHTTPComponent({
      name: `Fullnode ${serverUrl}`,
      id: serverUrl,
    });

    component.add_healthcheck(async () => HealthService.getFullnodeHealth());
    this.healthcheck.add_component(component);
  }

  initializeTxMiningServiceComponent() {
    const txMiningServiceUrl = hathorLibConfig.getTxMiningUrl();

    const component = new HealthcheckHTTPComponent({
      name: `TxMiningService ${txMiningServiceUrl}`,
      id: txMiningServiceUrl,
    });

    component.add_healthcheck(async () => HealthService.getTxMiningServiceHealth());
    this.healthcheck.add_component(component);
  }

  async getHealth() {
    return this.healthcheck.run();
  }

  /**
   * Returns the health object for a specific wallet
   *
   * @param {HathorWallet} wallet
   * @returns {HealthcheckCallbackResponse}
   */
  static async getWalletHealth(wallet) {
    if (!wallet.isReady()) {
      return new HealthcheckCallbackResponse({
        status: HealthcheckStatus.FAIL,
        output: `Wallet is not ready. Current state: ${friendlyWalletState[wallet.state]}`
      });
    }
    return new HealthcheckCallbackResponse({
      status: HealthcheckStatus.PASS,
      output: 'Wallet is ready'
    });
  }

  /**
   * Returns the health object for the connected fullnode
   *
   * @returns {HealthcheckCallbackResponse}
   */
  static async getFullnodeHealth() {
    let output;
    let healthStatus;

    try {
      const healthData = await healthApi.getHealth();

      healthStatus = healthData.status;

      const config = getConfig();

      const isUnhealthy = healthStatus === HealthcheckStatus.FAIL
        || (healthStatus === HealthcheckStatus.WARN && config.considerHealthcheckWarnAsUnhealthy);

      if (isUnhealthy) {
        output = `Fullnode reported as unhealthy: ${JSON.stringify(healthData)}`;
      } else {
        output = 'Fullnode is healthy';
      }
    } catch (e) {
      if (e.response && e.response.data) {
        output = `Fullnode reported as unhealthy: ${JSON.stringify(e.response.data)}`;
        healthStatus = e.response.data.status;
      } else {
        output = `Error getting fullnode health: ${e.message}`;
        healthStatus = HealthcheckStatus.FAIL;
      }
    }

    return new HealthcheckCallbackResponse({
      status: healthStatus,
      output
    });
  }

  /**
   * Returns the health object for the connected tx-mining-service
   *
   * @returns {HealthcheckCallbackResponse}
   */
  static async getTxMiningServiceHealth() {
    let output;
    let healthStatus;

    try {
      const healthData = await txMiningApi.getHealth();

      healthStatus = healthData.status;

      const config = getConfig();

      const isUnhealthy = healthStatus === HealthcheckStatus.FAIL
        || (healthStatus === HealthcheckStatus.WARN && config.considerHealthcheckWarnAsUnhealthy);

      if (isUnhealthy) {
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

    return new HealthcheckCallbackResponse({
      status: healthStatus,
      output
    });
  }
}

export default HealthService;
