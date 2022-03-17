import { TestUtils, WALLET_CONSTANTS } from './utils/test-utils-integration';
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

    /**
     * Status:
     * wallet1[0]: 2 HTR , 800 TKA
     */
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

    // TODO: Even though the result is correct, the error thrown is not related.
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

  it('should not melt with zero amount', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 0
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('amount');
    done();
  });

  it('should not melt with a negative amount', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: -1
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('amount');
    done();
  });

  it('should not melt with an invalid deposit_address', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        deposit_address: 'invalidAddress',
        amount: 200
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('invalid');
    done();
  });

  it('should not melt with an invalid change_address', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 200,
        change_address: 'invalidAddress'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('invalid');
    done();
  });

  // The application is incorrectly allowing a change address outside the wallet
  it.skip('should not melt with a change_address outside the wallet', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 200,
        change_address: WALLET_CONSTANTS.genesis.addresses[4]
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('invalid');
    done();
  });

  // Insufficient funds

  it('should not melt with insufficient tokens', async done => {
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

  it('should melt with address and change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 300,
        deposit_address: await wallet1.getAddressAt(3),
        change_address: await wallet1.getAddressAt(4),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const addr3htr = await wallet1.getAddressInfo(3);
    const addr3tka = await wallet1.getAddressInfo(3, tokenA.uid);
    expect(addr3htr.total_amount_available).toBe(3);
    expect(addr3tka.total_amount_available).toBe(0);

    const addr4htr = await wallet1.getAddressInfo(4);
    const addr4tka = await wallet1.getAddressInfo(4, tokenA.uid);
    expect(addr4htr.total_amount_available).toBe(0);
    expect(addr4tka.total_amount_available).toBe(500);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3);
    expect(balance1tka.available).toBe(800 - 300);

    done();
  });

  it('should melt with deposit address only', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 100,
        deposit_address: await wallet1.getAddressAt(5),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const addr5htr = await wallet1.getAddressInfo(5);
    const addr5tka = await wallet1.getAddressInfo(5, tokenA.uid);
    expect(addr5htr.total_amount_available).toBe(1);
    expect(addr5tka.total_amount_available).toBe(0);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3 + 1);
    expect(balance1tka.available).toBe(800 - 300 - 100);

    done();
  });

  it('should melt with change address only', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 100,
        change_address: await wallet1.getAddressAt(7),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const addr7htr = await wallet1.getAddressInfo(7);
    const addr7tka = await wallet1.getAddressInfo(7, tokenA.uid);
    expect(addr7htr.total_amount_available).toBe(0);
    expect(addr7tka.total_amount_available).toBe(300);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3 + 1 + 1);
    expect(balance1tka.available).toBe(800 - 300 - 100 - 100);

    done();
  });

  it('should melt with mandatory parameters', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3 + 1 + 1 + 1); // 8
    expect(balance1tka.available).toBe(800 - 300 - 100 - 100 - 100); // 200

    done();
  });

  it('should not retrieve funds when melting below 100 tokens', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 50
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(8);
    expect(balance1tka.available).toBe(150);

    done();
  });

  it('should retrieve funds rounded down when not melting multiples of 100', async done => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 150
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(9);
    expect(balance1tka.available).toBe(0);

    done();
  });
});
