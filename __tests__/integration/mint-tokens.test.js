import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('mint token', () => {
  let wallet1;
  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = new WalletHelper('mint-token-1');

    // Starting the wallets
    await WalletHelper.startMultipleWalletsForTest([wallet1]);

    // Creating a token for the tests
    await wallet1.injectFunds(10, 0, { doNotWait: true });
    const tkAtx = await wallet1.createToken({
      name: tokenA.name,
      symbol: tokenA.symbol,
      amount: 500,
      address: await wallet1.getAddressAt(0),
      change_address: await wallet1.getAddressAt(0)
    });
    tokenA.uid = tkAtx.hash;
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  // Testing failures first, that do not cause side-effects on the blockchain

  it('should not mint an invalid token', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: 'invalidToken',
        address: await wallet1.getAddressAt(1),
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);

    // Even though the result is correct, the error thrown is not related. Should be fixed later.
    // expect(response.body.message).toContain('invalid');
    done();
  });

  it('should not mint with an invalid address', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: 'invalidAddress',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('base58');
    done();
  });

  it('should not mint with an invalid change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        change_address: 'invalidAddress',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('invalid');
    done();
  });

  it('should not mint with an invalid amount', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 'invalidVamount'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('invalid');
    done();
  });

  // Insufficient funds

  it('should not mint with insuficcient funds', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 1000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('HTR funds');
    done();
  });

  // Success

  it('should mint without a change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 300
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    done();
  });

  it('should mint with a change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        change_address: await wallet1.getAddressAt(10),
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    const addr10 = await wallet1.getAddressInfo(10);
    expect(addr10.total_amount_received).toBe(1);
    done();
  });
});
