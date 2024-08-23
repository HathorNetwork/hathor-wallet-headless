import { HathorWallet } from '@hathor/wallet-lib';
import TestUtils from './test-utils';
import { initializedWallets } from '../src/services/wallets.service';

const walletId = 'stub_stop';

describe('addresses api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  it('should stop a wallet that has entered the ERROR state', async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    wallet.setState(HathorWallet.ERROR);

    const response = await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
  });
});
