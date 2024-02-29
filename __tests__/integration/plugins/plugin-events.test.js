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
    /*
     * Mimic the behavior of `src/plugins/child.js` because it is not called within the context of
     * Jest. However, here we initialize the plugin within the main process to allow for integration
     * testing.
     *
     * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/src/index.js
     * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/src/plugins/child.js
     */
    childManager.hathorPlugins.integration = {
      name: 'integration',
      file: '../../__tests__/integration/plugins/integration_test_plugin',
    };
    [loadedPlugin] = await childManager.loadPlugins(['integration'], {});
    loadedPlugin.init(notificationBus);

    try {
      // Initialize an empty wallet
      wallet1 = WalletHelper.getPrecalculatedWallet(pluginWalletId);
      await WalletHelper.startMultipleWalletsForTest([wallet1]);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    loadedPlugin.close();
  });

  it('should return the events that led to complete wallet start', async () => {
    const currentHistory = loadedPlugin
      .retrieveEventHistory();

    // The full event history should have more elements than those of the test wallet
    const testWalletHistory = currentHistory.filter(event => event.walletId === pluginWalletId);
    expect(currentHistory.length).toBeGreaterThan(testWalletHistory.length);

    // There must have been events indicating state change on the wallet
    expect(testWalletHistory.filter(event => event.type === 'wallet:state-change').length).toBeGreaterThanOrEqual(1);

    // There is a wallet load partial update indicating an empty wallet
    const walletLoadPartialEvents = testWalletHistory.filter(event => event.type === 'wallet:load-partial-update');
    expect(walletLoadPartialEvents).toHaveLength(1);
    expect(walletLoadPartialEvents[0].data).toStrictEqual({
      addressesFound: 20, historyLength: 0
    });
  });

  it('should return the events related to a successful transaction', async () => {
    // Add funds to the address on index 0
    const fundTxObj1 = await wallet1.injectFunds(10, 0);

    const testWalletHistory = loadedPlugin
      .retrieveEventHistory()
      .filter(event => event.walletId === pluginWalletId);

    // There is a wallet history update with the transaction specified above
    const walletHistoryEvents = testWalletHistory.filter(event => event.type === 'node:wallet-update');
    expect(walletHistoryEvents.length).toBeGreaterThanOrEqual(1);
    expect(walletHistoryEvents[0].data?.address).toEqual(await wallet1.getAddressAt(0));

    // There is a wallet load partial update
    const walletLoadPartialEvents = testWalletHistory.filter(event => event.type === 'wallet:load-partial-update');
    expect(walletLoadPartialEvents).toHaveLength(2);
    expect(walletLoadPartialEvents[1].data).toStrictEqual({
      addressesFound: 21, historyLength: 1
    });

    // There is a new tx event
    const newTxEvents = testWalletHistory.filter(event => event.type === 'wallet:new-tx');
    expect(newTxEvents).toHaveLength(1);
    expect(newTxEvents[0].data?.tx_id).toEqual(fundTxObj1.hash);

    // There is a new update event
    const updateTxEvents = testWalletHistory.filter(event => event.type === 'wallet:update-tx');
    expect(updateTxEvents).toHaveLength(1);
    expect(updateTxEvents[0].data?.tx_id).toEqual(fundTxObj1.hash);
  });
});
