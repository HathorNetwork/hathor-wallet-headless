import { TestUtils } from '../utils/test-utils-integration';
import { WalletHelper } from '../utils/wallet-helper';
import { notificationBus } from '../../../src/services/notification.service';
import * as childManager from '../../../src/plugins/child';

let loadedPlugin = null;
const walletId = 'plugin-wallet';
describe('test the plugin event handler', () => {
  /** @type {WalletHelper} */
  let wallet1;

  beforeAll(async () => {
    // Mimic the behavior or `src/plugins/child.js`, that is not called within the context of Jest
    childManager.hathorPlugins.integration = {
      name: 'integration',
      file: '../../__tests__/integration/plugins/integration_test_plugin',
    };

    [loadedPlugin] = await childManager.loadPlugins(['integration'], {});
    loadedPlugin.init(notificationBus);

    try {
      // A random HTR value for the first wallet
      wallet1 = WalletHelper.getPrecalculatedWallet(walletId);
      await wallet1.start();
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  it('should return the events that led to complete wallet start', async () => {
    const currentHistory = loadedPlugin.retrieveEventHistory();
    console.dir(currentHistory);

    // The event history has many elements
    expect(currentHistory).toHaveLength(8);

    // There must have been 5 wallet changes
    expect(currentHistory.filter(event => event.type === 'wallet:state-change')).toHaveLength(5);

    // All events must have the correct wallet id
    expect(currentHistory.every(event => event.walletId === walletId)).toBeTruthy();
  });
});
