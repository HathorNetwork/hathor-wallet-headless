import { EventEmitter } from 'events';
import settingsFixture from './__fixtures__/settings-fixture';
import { setupWalletStateLogs } from '../src/services/logger.service';

describe('reload of enableShieldedOutputs', () => {
  const settings = jest.requireActual('../src/settings');

  it('should stop all wallets when it changes', async () => {
    const oldConfig = settingsFixture._getDefaultConfig();
    delete oldConfig.enableShieldedOutputs;
    for (const enableShieldedOutputs of [true, false]) {
      const newConfig = { ...settingsFixture._getDefaultConfig(), enableShieldedOutputs };
      // eslint-disable-next-line no-await-in-loop
      const action = await settings._analizeConfig(oldConfig, newConfig);
      expect(action.stopAllWallets).toBe(true);
    }
  });

  it('should refuse a reload to a value that is not true, false or unset', async () => {
    const oldConfig = settingsFixture._getDefaultConfig();
    for (const enableShieldedOutputs of ['false', 0, 1]) {
      const newConfig = { ...settingsFixture._getDefaultConfig(), enableShieldedOutputs };
      // eslint-disable-next-line no-await-in-loop
      const action = await settings._analizeConfig(oldConfig, newConfig);
      expect(action.nonRecoverable).toBe(true);
    }
  });

  it('should refuse to set up a config with an invalid value', async () => {
    // As settings.test.js does: the config module is mocked before the first
    // setupConfig() of the real settings module
    jest.doMock('../src/config', () => ({
      __esModule: true,
      default: { ...settingsFixture._getDefaultConfig(), enableShieldedOutputs: 'false' },
    }));
    await expect(settings.setupConfig()).rejects.toThrow('Invalid enableShieldedOutputs');
    jest.dontMock('../src/config');
  });

  it('should not stop the wallets when it stays the same', async () => {
    const config = settingsFixture._getDefaultConfig();
    const action = await settings._analizeConfig(config, settingsFixture._getDefaultConfig());
    expect(action.stopAllWallets).toBe(false);
  });
});

describe('shielded capability log', () => {
  function capability(changes) {
    return {
      level: 'full',
      reason: null,
      cause: null,
      canReceive: true,
      canSpend: true,
      historyComplete: true,
      undecoded: { txIds: [], locked: 0, unreadable: 0, error: 0 },
      ...changes,
    };
  }

  function logLevelFor(shieldedEnabled, changes) {
    const wallet = new EventEmitter();
    wallet.conn = new EventEmitter();
    const logger = { info: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    setupWalletStateLogs(wallet, logger, { shieldedEnabled });
    wallet.emit('shielded-capability', capability(changes));
    if (logger.warn.mock.calls.length) return 'warn';
    if (logger.info.mock.calls.length) return 'info';
    return null;
  }

  it('should log level full at info with shielded outputs on', () => {
    expect(logLevelFor(true, {})).toBe('info');
  });

  it('should warn with shielded outputs on when funds may be missed', () => {
    expect(logLevelFor(true, { level: 'watch', reason: 'locked' })).toBe('warn');
    expect(logLevelFor(true, { historyComplete: false })).toBe('warn');
    expect(logLevelFor(true, { undecoded: { txIds: ['aa'], locked: 0, unreadable: 0, error: 1 } }))
      .toBe('warn');
  });

  it('should only inform with shielded outputs on for wallets that can never hold them', () => {
    // Below full by design, with an incomplete shielded history too
    for (const reason of ['multisig', 'no-shielded-keys', 'hardware']) {
      expect(logLevelFor(true, { level: 'none', reason, historyComplete: false })).toBe('info');
    }
    // A seed wallet whose provider failed to load does miss funds
    expect(logLevelFor(true, { level: 'none', reason: 'no-provider', historyComplete: false }))
      .toBe('warn');
  });

  it('should only inform with shielded outputs off', () => {
    expect(logLevelFor(false, { level: 'none', reason: 'no-provider' })).toBe('info');
    expect(logLevelFor(false, { level: 'none', reason: 'multisig' })).toBe('info');
  });
});
