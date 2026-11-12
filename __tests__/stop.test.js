import { HathorWallet } from '@hathor/wallet-lib';
import TestUtils from './test-utils';
import { initializedWallets } from '../src/services/wallets.service';

const walletId = 'stub_stop';

describe('addresses api', () => {
  beforeEach(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterEach(async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    if (!wallet) {
      return;
    }
    wallet.setState(HathorWallet.ERROR);
    await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });
  });

  it('should stop a wallet that has entered the ERROR state', async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    wallet.setState(HathorWallet.ERROR);

    const response = await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should not stop a wallet that is SYNCING', async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    wallet.setState(HathorWallet.SYNCING);

    const response = await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(HathorWallet.SYNCING);
    expect(response.body.statusMessage).toBe('Syncing');
  });

  it('should not stop a wallet that is CONNECTING', async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    wallet.setState(HathorWallet.CONNECTING);

    const response = await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should not stop a wallet that is CLOSED', async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    wallet.setState(HathorWallet.CLOSED);

    const response = await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(HathorWallet.CLOSED);
    expect(response.body.statusMessage).toBe('Closed');
  });

  it('should name the wallet state when another route finds it not ready', async () => {
    /** @type {HathorWallet} */
    const wallet = initializedWallets.get(walletId);
    wallet.setState(HathorWallet.SYNCING);

    const response = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      success: false,
      message: 'Wallet is not ready.',
      statusCode: HathorWallet.SYNCING,
      statusMessage: 'Syncing',
    });
  });

  it('should send an empty state message when the wallet id is unknown', async () => {
    const response = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': 'stub_stop_unknown' });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      success: false,
      message: 'Invalid wallet id parameter.',
      statusMessage: '',
    });
  });
});
