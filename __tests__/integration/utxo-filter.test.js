import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('balance routes', () => {
  /** @type WalletHelper */
  let wallet1;

  beforeAll(async () => {
    try {
      // First wallet, no balance
      wallet1 = new WalletHelper('utxo-filter-1');

      await WalletHelper.startMultipleWalletsForTest([wallet1]);

      await TestUtils.pauseForWsUpdate();
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  it('should return empty results for an empty wallet', async done => {
    const utxoResponse = await TestUtils.request
      .get('/wallet/utxo-filter')
      .set({ 'x-wallet-id': wallet1.walletId });

    const utxoResults = utxoResponse.body;
    expect(utxoResults.total_amount_available).toBe(0);
    expect(utxoResults.total_utxos_available).toBe(0);
    expect(utxoResults.total_amount_locked).toBe(0);
    expect(utxoResults.total_utxos_locked).toBe(0);
    expect(utxoResults.utxos).toHaveProperty('length', 0);
    done();
  });
});
