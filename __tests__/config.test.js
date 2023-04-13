import { config as hathorLibConfig } from '@hathor/wallet-lib';
// import { config } from '../src/config';
import { initHathorLib } from '../src/app';

describe('wallet lib config', () => {
  it('correctly sets the tx-mining-service api-key', () => {
    const currentApiKey = hathorLibConfig.getTxMiningApiKey();
    expect(currentApiKey).toBeUndefined();

    global.config.txMiningApiKey = '123123';

    initHathorLib();

    const newApiKey = hathorLibConfig.getTxMiningApiKey();
    expect(newApiKey).toEqual('123123');
  });

  it('correctly sets the atomicSwapService url', () => {
    // Setting each of the possible network pre-configurations to test the initialization logic

    // Mainnet
    global.config.network = 'mainnet';
    initHathorLib();
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://atomic-swap-service.mainnet.mock/');

    // Testnet
    global.config.network = 'testnet';
    initHathorLib();
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://atomic-swap-service.testnet.mock/');

    // No predetermined url: returns the testnet
    global.config.network = 'privatenet';
    initHathorLib();
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://atomic-swap-service.testnet.mock/');

    // Explicit configuration: must return the set value
    global.config.atomicSwapService = 'https://private-swap.service/';
    initHathorLib();
    expect(hathorLibConfig.getSwapServiceBaseUrl())
      .toStrictEqual('https://private-swap.service/');

    // Restore mocks
    jest.resetModules();
  });
});
