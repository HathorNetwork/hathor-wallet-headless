import { config as hathorLibConfig } from '@hathor/wallet-lib';

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
});
