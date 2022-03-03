import {
  getRandomInt,
  HATHOR_TOKEN_ID,
  TestUtils,
  WALLET_CONSTANTS
} from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('address-info routes', () => {
  let wallet1;
  let wallet2;
  const address1balance = getRandomInt(200, 100);
  let customTokenHash;

  beforeAll(async () => {
    try {
      // A random HTR value for the first wallet
      wallet1 = new WalletHelper('addinfo-1');
      await wallet1.start();
      await wallet1.injectFunds(address1balance, 1);

      // A fixed custom token amount for the second wallet
      wallet2 = new WalletHelper('addinfo-2');
      await wallet2.start();
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

  it('should return results for an address (empty)', async done => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: await wallet1.getAddressAt(0) })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(0);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(0);
    expect(results.total_amount_locked).toBe(0);
    done();
  });

  it('should return results for an address with a single receiving transaction', async done => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: await wallet1.getAddressAt(1) })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(1);
    expect(results.total_amount_received).toBe(address1balance);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(address1balance);
    expect(results.total_amount_locked).toBe(0);
    done();
  });

  it('should return correct locked balance for an address with miner rewards', async done => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: WALLET_CONSTANTS.genesis.addresses[1] }) // Miner rewards address
      .set({ 'x-wallet-id': WALLET_CONSTANTS.genesis.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(2);
    expect(results.total_amount_received).toBeGreaterThan(0);

    /*
     * According to the REWARD_SPEND_MIN_BLOCKS variable in the ./configuration/privnet.py file
     * the miner rewards are locked for exactly one block. Since we have only one miner reward
     * address, this value should be always 6400 or greater.
     *
     * Should another miner reward address be included later, this assertion must be recalculated.
     */
    expect(results.total_amount_locked).toBeGreaterThanOrEqual(6400);
    done();
  });

  it('should return results for an address with send/receive transactions', async done => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: await wallet2.getAddressAt(0) })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(15); // 10 from genesis, 5 from token creation change
    expect(results.total_amount_sent).toBe(10); // token creation tx
    expect(results.total_amount_available).toBe(5); // change
    expect(results.total_amount_locked).toBe(0);
    done();
  });

  it('should return results for custom token for an address (empty)', async done => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({
        address: await wallet2.getAddressAt(0),
        token: customTokenHash,
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(customTokenHash);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(0);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(0);
    expect(results.total_amount_locked).toBe(0);
    done();
  });

  it('should return results for custom token on an address with a single transaction', async done => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({
        address: await wallet2.getAddressAt(1),
        token: customTokenHash,
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(customTokenHash);
    expect(results.index).toBe(1);
    expect(results.total_amount_received).toBe(500);
    expect(results.total_amount_sent).toBe(0);
    expect(results.total_amount_available).toBe(500);
    expect(results.total_amount_locked).toBe(0);
    done();
  });
});
