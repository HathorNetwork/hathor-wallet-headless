import hathorLib from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import { multisigWalletsData } from '../../scripts/helpers/wallet-precalculation.helper';
import precalculatedMultisig from './configuration/precalculated-multisig-wallets.json';
import settings from '../../src/settings';
import { initializedWallets } from '../../src/services/wallets.service';

/**
 * End-to-end coverage for multisig (P2SH) history sync over `manual_stream_ws`: proves the
 * headless -> wallet-lib -> fullnode chain reconstructs a multisig balance through streaming. The
 * routing decision itself is unit-tested in `__tests__/history-sync.test.js`.
 *
 * A polling funder establishes the balance; a fresh streaming wallet must reconstruct it. The
 * multisig fixture addresses are shared and persistent across test files, so assertions are
 * relative to the polling balance, never an absolute amount.
 */
describe('multisig manual stream sync', () => {
  const seedKey = 'multisig-stream';
  const funderWalletId = 'multisig-stream-funder';
  const streamWalletId = 'multisig-stream-sync';
  const { words, walletConfig } = multisigWalletsData;
  const multisigAddresses = precalculatedMultisig[0].addresses;

  /** @type {WalletHelper} */
  let funder;

  beforeAll(async () => {
    const config = settings.getConfig();
    config.seeds = { ...config.seeds, [seedKey]: words[0] };
    config.multisig = { ...config.multisig, [seedKey]: walletConfig };
    settings._setConfig(config);

    // The funder uses the default (polling) sync mode to establish the ground-truth balance that
    // the streaming wallet must later reconstruct on its own.
    funder = new WalletHelper(funderWalletId, {
      seedKey,
      multisig: true,
      preCalculatedAddresses: multisigAddresses,
    });
    await WalletHelper.startMultipleWalletsForTest([funder]);
  });

  afterAll(async () => {
    await TestUtils.stopWallet(streamWalletId);
    await funder.stop();
    const config = settings.getConfig();
    config.seeds = {};
    config.multisig = {};
    settings._setConfig(config);
  });

  it('should sync a multisig (P2SH) wallet history via manual websocket streaming', async () => {
    // Fund before the streaming wallet starts, so the funds can only be found by the history sync,
    // never by a live `new-tx` event.
    const fundedAddress = await funder.getAddressAt(0);
    expect(fundedAddress).toBe(multisigAddresses[0]);

    const balanceBefore = (await funder.getBalance()).available;
    await funder.injectFunds(10, 0);
    const balanceAfter = (await funder.getBalance()).available;
    expect(Number(balanceAfter) - Number(balanceBefore)).toBe(10);

    // Fresh wallet syncing from scratch. No pre-calculated addresses, so the P2SH addresses are
    // genuinely derived and streamed rather than loaded from a fixture.
    const startResponse = await TestUtils.request
      .post('/start')
      .send({
        seedKey,
        'wallet-id': streamWalletId,
        multisig: true,
        history_sync_mode: 'manual_stream_ws',
      });
    expect(startResponse.status).toBe(200);
    expect(startResponse.body.success).toBe(true);
    await TestUtils.poolUntilWalletReady(streamWalletId);

    const streamWallet = initializedWallets.get(streamWalletId);

    // Guard against silent fallback: without the `history-streaming` capability the wallet quietly
    // syncs via HTTP polling (HathorWallet.syncHistory), passing this test without exercising it.
    expect(streamWallet.historySyncMode).toBe(hathorLib.HistorySyncMode.MANUAL_STREAM_WS);
    await expect(streamWallet.conn.hasCapability('history-streaming')).resolves.toBe(true);

    // Streaming and polling derive the same addresses, so they must reconstruct the same balance.
    const streamBalance = (await TestUtils.getBalance(streamWalletId)).available;
    expect(streamBalance).toBe(balanceAfter);

    // The streamed P2SH addresses must match the canonical fixture set.
    for (let i = 0; i < 5; i++) {
      const address = await TestUtils.getAddressAt(streamWalletId, i);
      expect(address).toBe(multisigAddresses[i]);
    }
  });
});
