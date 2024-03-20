import { TestUtils } from './utils/test-utils-integration';
import { HATHOR_TOKEN_ID, WALLET_CONSTANTS } from './configuration/test-constants';
import { getRandomInt } from './utils/core.util';
import { WalletHelper } from './utils/wallet-helper';

describe('address-info routes', () => {
  let wallet1;
  let wallet2;
  let minerWallet;
  const address1balance = getRandomInt(200, 100);
  let customTokenHash;

  beforeAll(async () => {
    try {
      // A random HTR value for the first wallet
      wallet1 = WalletHelper.getPrecalculatedWallet('addinfo-1');
      // A fixed custom token amount for the second wallet
      wallet2 = WalletHelper.getPrecalculatedWallet('addinfo-2');
      minerWallet = new WalletHelper(
        WALLET_CONSTANTS.miner.walletId,
        {
          words: WALLET_CONSTANTS.miner.words,
          preCalculatedAddresses: WALLET_CONSTANTS.miner.addresses
        }
      );

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2, minerWallet]);
      await wallet1.injectFunds(address1balance, 1);
      await wallet2.injectFunds(10);
      const customToken = await wallet2.createToken({
        amount: 500,
        name: 'AddInfo Token',
        symbol: 'AIT',
        address: await wallet2.getAddressAt(1),
        change_address: await wallet2.getAddressAt(0)
      });
      customTokenHash = customToken.hash;

      /*
       * The state here should be:
       * wallet1[1] with some value between 100 and 200 HTR
       * wallet2[0] with 5 HTR
       * wallet2[1] with 500 AIT
       */
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should return results for an address (empty)', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: await wallet1.getAddressAt(0) })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBe(true);
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(0);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(0);
    expect(results.total_amount_locked).toBe(0);
  });

  it('should return results for an address with a single receiving transaction', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: await wallet1.getAddressAt(1) })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBe(true);
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(1);
    expect(results.total_amount_received).toBe(address1balance);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(address1balance);
    expect(results.total_amount_locked).toBe(0);
  });

  it('should return correct locked balance for an address with miner rewards', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: WALLET_CONSTANTS.miner.addresses[0] }) // Miner rewards address
      .set({ 'x-wallet-id': minerWallet.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBe(true);
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBeGreaterThan(0);

    /*
     * According to the REWARD_SPEND_MIN_BLOCKS variable in the ./configuration/privnet.py file
     * the miner rewards are locked for exactly one block. Since we have only one miner reward
     * address, this value should be always 6400 or greater.
     *
     * Should another miner reward address be included later, this assertion must be recalculated.
     */
    expect(results.total_amount_locked).toBeGreaterThanOrEqual(6400);
  });

  it('should return results for an address with send/receive transactions', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: await wallet2.getAddressAt(0) })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBe(true);
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(15); // 10 from genesis, 5 from token creation change
    expect(results.total_amount_sent).toBe(10); // token creation tx
    expect(results.total_amount_available).toBe(5); // change
    expect(results.total_amount_locked).toBe(0);
  });

  it('should return results for custom token for an address (empty)', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({
        address: await wallet2.getAddressAt(0),
        token: customTokenHash,
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBe(true);
    expect(results.token).toBe(customTokenHash);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(0);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(0);
    expect(results.total_amount_locked).toBe(0);
  });

  it('should return results for custom token on an address with a single transaction', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({
        address: await wallet2.getAddressAt(1),
        token: customTokenHash,
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBe(true);
    expect(results.token).toBe(customTokenHash);
    expect(results.index).toBe(1);
    expect(results.total_amount_received).toBe(500);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(500);
    expect(results.total_amount_locked).toBe(0);
  });
});
