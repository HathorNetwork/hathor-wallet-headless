import hathorLib from '@hathor/wallet-lib';
import TestUtils from './test-utils';
import settings from '../src/settings';
import {
  initializedWallets,
  isShieldedCapable,
  isShieldedEnabled,
  resetShieldedNetworkCheck,
} from '../src/services/wallets.service';

const walletId = 'stub_history_sync';
// Read-only wallets have no shielded keys, so they keep the configured sync mode
const XPUBKEY = 'xpub6C95ufyyhEr2ntyGGfeHjyvxffmNZQ7WugyChhu1Fzor1tMUc4K2MUdwkcJoTzjVkg46hurWWU9gvZoivLiDk6MdsKukz3JiX5Fib2BDa2T';

describe('history sync', () => {
  beforeEach(() => {
    settings._resetConfig();
  });

  afterEach(async () => {
    await TestUtils.stopWallet({ walletId, pollInterval: 2000 });
  });

  it('should start a wallet with default xpub streaming if not configured', async () => {
    const config = settings._getDefaultConfig();
    delete config.history_sync_mode;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ xpubkey: XPUBKEY, 'wallet-id': walletId });
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
      .send({ xpubkey: XPUBKEY, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
  });

  it('should use the history sync from the request when provided', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'polling_http_api';
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({
        xpubkey: XPUBKEY,
        'wallet-id': walletId,
        history_sync_mode: 'manual_stream_ws',
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
  });

  it('should default a shielded-capable seed wallet to polling', async () => {
    const config = settings._getDefaultConfig();
    delete config.history_sync_mode; // resolves to the xpub default
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.POLLING_HTTP_API);
  });

  it('should force polling on a shielded-capable seed wallet when streaming is configured', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'manual_stream_ws';
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.POLLING_HTTP_API);
  });

  it('should force polling on a shielded-capable seed wallet when streaming is requested', async () => {
    const config = settings._getDefaultConfig();
    delete config.history_sync_mode;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({
        seedKey: TestUtils.seedKey,
        'wallet-id': walletId,
        history_sync_mode: 'xpub_stream_ws',
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.POLLING_HTTP_API);
  });

  it('should default a multisig wallet to manual streaming instead of polling', async () => {
    const config = settings._getDefaultConfig();
    delete config.history_sync_mode; // resolves to the xpub default
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
  });

  it('should redirect a multisig wallet to manual streaming when xpub streaming is explicitly requested', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'polling_http_api';
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({
        seedKey: TestUtils.seedKey,
        'wallet-id': walletId,
        multisig: true,
        history_sync_mode: 'xpub_stream_ws',
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
  });

  it('should keep polling for a multisig wallet when polling is explicitly configured', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'polling_http_api';
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.POLLING_HTTP_API);
  });

  it('should keep manual streaming for a multisig wallet when explicitly configured', async () => {
    const config = settings._getDefaultConfig();
    config.history_sync_mode = 'manual_stream_ws';
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const wallet = initializedWallets.get(walletId);
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
  });
});

describe('isShieldedCapable', () => {
  const shieldedProvider = {};
  const shielded = { shieldedEnabled: true, shieldedProvider };

  it('should be true only for a single-signature seed wallet with shielded outputs on', () => {
    expect(isShieldedCapable({ seed: 'words' }, shielded)).toBe(true);
    expect(isShieldedCapable({ seed: 'words', multisig: null }, shielded)).toBe(true);
  });

  it('should be false with shielded outputs off', () => {
    expect(isShieldedCapable({ seed: 'words' }, { shieldedEnabled: false, shieldedProvider }))
      .toBe(false);
  });

  it('should be false without the shielded crypto provider', () => {
    expect(isShieldedCapable({ seed: 'words' }, { shieldedEnabled: true, shieldedProvider: null }))
      .toBe(false);
  });

  it('should be false for wallets without shielded keys', () => {
    expect(isShieldedCapable({ xpub: XPUBKEY }, shielded)).toBe(false);
    expect(isShieldedCapable({ seed: 'words', multisig: TestUtils.multisigData }, shielded))
      .toBe(false);
  });
});

describe('isShieldedEnabled', () => {
  let versionSpy;

  beforeEach(() => {
    resetShieldedNetworkCheck();
    versionSpy = jest.spyOn(hathorLib.versionApi, 'asyncGetVersion');
  });

  afterEach(() => {
    versionSpy.mockRestore();
    resetShieldedNetworkCheck();
  });

  it('should follow the fullnode network when the config does not set it', async () => {
    versionSpy.mockResolvedValueOnce({ network: 'testnet-shielded-outputs' });
    expect(await isShieldedEnabled({ server: 'http://a/' })).toBe(true);
    // Privnets are not in the list: one with shielded outputs sets the config
    versionSpy.mockResolvedValueOnce({ network: 'privatenet' });
    expect(await isShieldedEnabled({ server: 'http://b/' })).toBe(false);
    versionSpy.mockResolvedValueOnce({ network: 'mainnet' });
    expect(await isShieldedEnabled({ server: 'http://c/' })).toBe(false);
  });

  it('should follow the config without asking the fullnode', async () => {
    expect(await isShieldedEnabled({ server: 'http://a/', enableShieldedOutputs: true })).toBe(true);
    expect(await isShieldedEnabled({ server: 'http://a/', enableShieldedOutputs: false })).toBe(false);
    expect(versionSpy).not.toHaveBeenCalled();
  });

  it('should refuse a value that is not true, false or unset', async () => {
    for (const enableShieldedOutputs of ['false', 'true', 0, 1]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(isShieldedEnabled({ server: 'http://a/', enableShieldedOutputs }))
        .rejects.toThrow('Invalid enableShieldedOutputs');
    }
    expect(versionSpy).not.toHaveBeenCalled();
  });

  it('should ask again after the check is reset, as on /reload-config', async () => {
    versionSpy
      .mockResolvedValueOnce({ network: 'mainnet' })
      .mockResolvedValueOnce({ network: 'testnet-shielded-outputs' });
    const config = { server: 'http://a/' };
    expect(await isShieldedEnabled(config)).toBe(false);
    resetShieldedNetworkCheck();
    expect(await isShieldedEnabled(config)).toBe(true);
    expect(versionSpy).toHaveBeenCalledTimes(2);
  });

  it('should ask once per fullnode, and again after a failed request', async () => {
    versionSpy
      .mockRejectedValueOnce(new Error('fullnode down'))
      .mockResolvedValue({ network: 'testnet-shielded-outputs' });
    const config = { server: 'http://a/' };

    await expect(isShieldedEnabled(config)).rejects.toThrow('fullnode down');
    expect(await isShieldedEnabled(config)).toBe(true);
    expect(await isShieldedEnabled(config)).toBe(true);
    expect(versionSpy).toHaveBeenCalledTimes(2);

    // Another fullnode, e.g. after /reload-config changed the server
    expect(await isShieldedEnabled({ server: 'http://b/' })).toBe(true);
    expect(versionSpy).toHaveBeenCalledTimes(3);
  });
});

describe('shielded outputs switch on /start', () => {
  let versionSpy;

  beforeEach(() => {
    settings._resetConfig();
    resetShieldedNetworkCheck();
    versionSpy = jest.spyOn(hathorLib.versionApi, 'asyncGetVersion');
  });

  afterEach(async () => {
    await TestUtils.stopWallet({ walletId, pollInterval: 2000 });
    versionSpy.mockRestore();
    resetShieldedNetworkCheck();
  });

  /**
   * Start a seed wallet with the default (xpub streaming) sync mode and the
   * given enableShieldedOutputs (undefined: unset).
   */
  async function startSeedWallet(enableShieldedOutputs) {
    const config = settings._getDefaultConfig();
    delete config.history_sync_mode;
    delete config.enableShieldedOutputs;
    if (enableShieldedOutputs !== undefined) {
      config.enableShieldedOutputs = enableShieldedOutputs;
    }
    settings._setConfig(config);
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.body.success).toBe(true);
    await TestUtils.waitReady({ walletId, retries: 10 });
    return initializedWallets.get(walletId);
  }

  it('should be off when unset and the fullnode network has no shielded outputs', async () => {
    versionSpy.mockResolvedValue({ network: 'mainnet' });
    const wallet = await startSeedWallet(undefined);

    // No provider, so the seed wallet keeps the configured sync mode
    expect(wallet.storage.shieldedCryptoProvider).toBeUndefined();
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.XPUB_STREAM_WS);

    const status = await TestUtils.request
      .get('/wallet/status')
      .set({ 'x-wallet-id': walletId });
    expect(status.body.shielded).toMatchObject({ level: 'none', reason: 'no-provider' });

    const address = await TestUtils.request
      .get('/wallet/address')
      .query({ legacy: false })
      .set({ 'x-wallet-id': walletId });
    expect(address.status).toBe(403);
    expect(address.body.errorCode).toBe('shielded-no-provider');

    const addresses = await TestUtils.request
      .get('/wallet/addresses')
      .query({ legacy: false })
      .set({ 'x-wallet-id': walletId });
    expect(addresses.status).toBe(403);
    expect(addresses.body.errorCode).toBe('shielded-no-provider');
  });

  it('should ask the fullnode for real when unset', async () => {
    // No stubbed answer: the request goes through wallet-lib to the stub
    // fullnode, which reports testnet-foxtrot, a network without shielded outputs
    const wallet = await startSeedWallet(undefined);
    expect(versionSpy).toHaveBeenCalledTimes(1);
    expect(wallet.storage.shieldedCryptoProvider).toBeUndefined();
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.XPUB_STREAM_WS);
  });

  it('should be on when unset and the fullnode network has shielded outputs', async () => {
    versionSpy.mockResolvedValue({ network: 'testnet-shielded-outputs' });
    const wallet = await startSeedWallet(undefined);
    expect(wallet.storage.shieldedCryptoProvider).toBeDefined();
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.POLLING_HTTP_API);
  });

  it('should be off when the config says false, without asking the fullnode', async () => {
    versionSpy.mockResolvedValue({ network: 'testnet-shielded-outputs' });
    const wallet = await startSeedWallet(false);
    expect(versionSpy).not.toHaveBeenCalled();
    expect(wallet.storage.shieldedCryptoProvider).toBeUndefined();
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.XPUB_STREAM_WS);
  });

  it('should be on when the config says true, without asking the fullnode', async () => {
    versionSpy.mockResolvedValue({ network: 'mainnet' });
    const wallet = await startSeedWallet(true);
    expect(versionSpy).not.toHaveBeenCalled();
    expect(wallet.storage.shieldedCryptoProvider).toBeDefined();
    expect(wallet.historySyncMode).toEqual(hathorLib.HistorySyncMode.POLLING_HTTP_API);
  });
});
