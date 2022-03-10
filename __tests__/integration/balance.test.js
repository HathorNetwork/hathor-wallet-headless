import { getRandomInt, TestUtils, WALLET_CONSTANTS } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('balance routes', () => {
  /** @type WalletHelper */
  let wallet1;
  let wallet2;
  let wallet3;
  const wallet2Balance = getRandomInt(200);

  beforeAll(async () => {
    try {
      // First wallet, no balance
      wallet1 = new WalletHelper('balance1');
      // Second wallet, random balance
      wallet2 = new WalletHelper('balance2');
      // Third wallet, balance to be used for custom tokens
      wallet3 = new WalletHelper('custom3');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2, wallet3]);
      await wallet2.injectFunds(wallet2Balance);
      await wallet3.injectFunds(100);

      await TestUtils.pauseForWsUpdate();
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
    await wallet3.stop();
  });

  it('should return zero for an empty wallet', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(balanceResult.body.available).toBe(0);
    expect(balanceResult.body.locked).toBe(0);
    done();
  });

  it('should return correct balance for a wallet with one transaction', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(balanceResult.body.available).toBe(wallet2Balance);
    expect(balanceResult.body.locked).toBe(0);
    done();
  });

  it('should return some locked balance for the miner wallet', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': WALLET_CONSTANTS.genesis.walletId });

    /*
     * According to the REWARD_SPEND_MIN_BLOCKS variable in the ./configuration/privnet.py file
     * the miner rewards are locked for exactly one block. Since we have only one miner reward
     * address, this value should be always 6400 or greater.
     *
     * Should another miner reward address be included later, this assertion must be recalculated.
     */
    expect(balanceResult.body.locked).toBeGreaterThanOrEqual(6400);
    done();
  });

  it('should return correct balance for a custom token (empty)', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: 'TST' })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(balanceResult.body.available).toBe(0);
    expect(balanceResult.body.locked).toBe(0);
    done();
  });

  it('should return correct balance for a custom token', async done => {
    const tokenAmount = getRandomInt(200, 100);
    const newToken = await wallet3.createToken({
      name: 'Test Token',
      symbol: 'TST',
      amount: tokenAmount,
    });
    const tokenHash = newToken.hash;

    await TestUtils.pauseForWsUpdate();

    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: tokenHash })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(balanceResult.body.available).toBe(tokenAmount);
    expect(balanceResult.body.locked).toBe(0);
    done();
  });
});
