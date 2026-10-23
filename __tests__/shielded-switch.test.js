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

  it('should only inform with shielded outputs off', () => {
    expect(logLevelFor(false, { level: 'none', reason: 'no-provider' })).toBe('info');
    expect(logLevelFor(false, { level: 'none', reason: 'multisig' })).toBe('info');
  });
});
