import hathorLib from '@hathor/wallet-lib';
import TestUtils from './test-utils';
import settings from '../src/settings';
import { initializedWallets } from '../src/services/wallets.service';

const walletId = 'stub_history_sync';

describe('history sync', () => {
  beforeEach(() => {
    settings._resetConfig();
  });

  afterEach(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should start a wallet with default xpub streaming if not configured', async () => {
    const config = settings._getDefaultConfig();
    delete config.history_sync_mode;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.XPUB_STREAM_WS);
  });

  it('should start a wallet with configured history sync', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'manual_stream_ws';
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
    await TestUtils.stopWallet({ walletId });
  });

  it('should use the history sync from the request when provided', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'polling_http_api';
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({
        seedKey: TestUtils.seedKey,
        'wallet-id': walletId,
        history_sync_mode: 'manual_stream_ws',
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
  });
});
