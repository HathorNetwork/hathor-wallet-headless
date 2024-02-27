import { TestUtils } from '../utils/test-utils-integration';
import { WalletHelper } from '../utils/wallet-helper';
import { notificationBus } from '../../../src/services/notification.service';
import * as childManager from '../../../src/plugins/child';

let loadedPlugin = null;
const pluginWalletId = 'plugin-wallet';

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
      wallet1 = WalletHelper.getPrecalculatedWallet(pluginWalletId);
      await WalletHelper.startMultipleWalletsForTest([wallet1]);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  it('should return the events that led to complete wallet start', async () => {
    const currentHistory = loadedPlugin
      .retrieveEventHistory();

    // The event history has many elements
    expect(currentHistory.length).toBeGreaterThanOrEqual(8);

    // There must have been 5 wallet changes for this test
    expect(currentHistory.filter(event => event.type === 'wallet:state-change' && event.walletId === pluginWalletId)).toHaveLength(5);
  });

  it('should return the events resulting from a successful transaction', async () => {
    const fundTxObj1 = await wallet1.injectFunds(10, 0);

    const currentHistory = loadedPlugin
      .retrieveEventHistory()
      .filter(event => event.walletId === pluginWalletId);
    console.dir(currentHistory);

    // The event history has more elements
    expect(currentHistory.length > 8).toBeTruthy();

    // There is a wallet history update
    const walletHistoryEvents = currentHistory.filter(event => event.type === 'node:wallet-update');
    expect(walletHistoryEvents.length).toBeGreaterThanOrEqual(1);
    expect(walletHistoryEvents[0].data?.address).toEqual(await wallet1.getAddressAt(0));
    console.dir({ walletHistoryEvents: walletHistoryEvents[0] });

    // There is a wallet load partial update
    const walletLoadPartialEvents = currentHistory.filter(event => event.type === 'wallet:load-partial-update');
    expect(walletLoadPartialEvents).toHaveLength(2);
    expect(walletLoadPartialEvents[0].data).toStrictEqual({
      addressesFound: 20, historyLength: 0
    });
    expect(walletLoadPartialEvents[1].data).toStrictEqual({
      addressesFound: 21, historyLength: 1
    });

    // There is a new tx event
    const newTxEvents = currentHistory.filter(event => event.type === 'wallet:new-tx');
    expect(newTxEvents).toHaveLength(1);
    expect(newTxEvents[0].data?.tx_id).toEqual(fundTxObj1.hash);

    // There is a new update event
    const updateTxEvents = currentHistory.filter(event => event.type === 'wallet:update-tx');
    expect(updateTxEvents).toHaveLength(1);
    expect(updateTxEvents[0].data?.tx_id).toEqual(fundTxObj1.hash);
  });
});
