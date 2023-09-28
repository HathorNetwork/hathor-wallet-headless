import { config as hathorLibConfig } from '@hathor/wallet-lib';
import settings from '../src/settings';
import { initHathorLib } from '../src/helpers/wallet.helper';

describe('wallet lib config', () => {
  it('correctly sets the tx-mining-service api-key', () => {
    const currentApiKey = hathorLibConfig.getTxMiningApiKey();
    expect(currentApiKey).toBeUndefined();

    const config = settings.getConfig();
    config.txMiningApiKey = '123123';

    initHathorLib(config);

    const newApiKey = hathorLibConfig.getTxMiningApiKey();
    expect(newApiKey).toEqual('123123');
  });

  it('correctly sets the atomicSwapService url', () => {
    // Setting each of the possible network pre-configurations to test the initialization logic

    // Mainnet
    const config = settings.getConfig();
    config.network = 'mainnet';
    initHathorLib(config);
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://atomic-swap-service.mainnet.mock/');

    // Testnet
    config.network = 'testnet';
    initHathorLib(config);
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://atomic-swap-service.testnet.mock/');

    // No predetermined url: returns the testnet
    config.network = 'privatenet';
    initHathorLib(config);
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://atomic-swap-service.testnet.mock/');

    // Explicit configuration: must return the set value
    config.atomicSwapService = 'https://private-swap.service/';
    initHathorLib(config);
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://private-swap.service/');

    // Restore mocks
    jest.resetModules();
  });
});
