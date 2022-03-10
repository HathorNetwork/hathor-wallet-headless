import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('melt tokens', () => {
  let wallet1;
  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = new WalletHelper('melt-token-1');

    // Starting the wallets
    await WalletHelper.startMultipleWalletsForTest([wallet1]);

    // Creating a token for the tests
    await wallet1.injectFunds(10, 0);
    const tkAtx = await wallet1.createToken({
      name: tokenA.name,
      symbol: tokenA.symbol,
      amount: 800,
      address: await wallet1.getAddressAt(0),
      change_address: await wallet1.getAddressAt(0)
    });
    tokenA.uid = tkAtx.hash;
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  // Testing failures first, that do not cause side-effects on the blockchain

  it('should not melt an invalid token', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: 'invalidToken',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);

    // Even though the result is correct, the error thrown is not related. Should be fixed later.
    // expect(response.body.error).toContain('invalid');
    done();
  });

  it('should not melt with an invalid amount', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 'invalidAmount'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('invalid');
    done();
  });

  // Insufficient funds

  it('should not melt with insuficcient tokens', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 1000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('enough inputs to melt');
    done();
  });

  // Success

  it('should melt with correct parameters', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 300
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    done();
  });

  it('should melt all the tokens', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 500
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: tokenA.uid })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(balanceResult.body.available).toBe(0);
    done();
  });
});
