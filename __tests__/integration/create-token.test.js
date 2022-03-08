import { getRandomInt, TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('create token', () => {
  let wallet1;
  let wallet2;

  const fundTx1 = {
    hash: null,
    index: null
  };
  const fundTx2 = {
    hash: null,
    index: null
  };

  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };
  const tokenB = {
    name: 'Token B',
    symbol: 'TKB',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = new WalletHelper('create-token-1');
    wallet2 = new WalletHelper('create-token-2');

    await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
    const fundTxObj1 = await wallet1.injectFunds(10, 0, { doNotWait: true });
    fundTx1.hash = fundTxObj1.hash;
    fundTx1.index = TestUtils.getOutputIndexFromTx(fundTxObj1, 10);

    const fundTxObj2 = await wallet1.injectFunds(10, 1, { doNotWait: true });
    fundTx2.hash = fundTxObj2.hash;
    fundTx2.index = TestUtils.getOutputIndexFromTx(fundTxObj2, 10);

    await wallet2.injectFunds(10, 0, { doNotWait: true });
    await TestUtils.delay(1000);
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  // Testing failures first, that do not cause side-effects on the blockchain

  it('should reject missing name parameter', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        symbol: tokenA.symbol,
        amount: 1000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status)
      .toBe(400);
    expect(response.body.success)
      .toBe(false);
    done();
  });

  it('should reject missing symbol parameter', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        amount: 1000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status)
      .toBe(400);
    expect(response.body.success)
      .toBe(false);
    done();
  });

  // Insuficcient funds

  it('should reject for insuficcient funds', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 3000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status)
      .toBe(200);
    expect(response.body.success)
      .toBe(false);
    expect(response.body.hash)
      .toBeUndefined();
    done();
  });

  it('should not create a token with the reserved HTR symbol', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Hathor',
        symbol: 'HTR',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status)
      .toBe(200);
    expect(response.body.success)
      .toBe(false);
    expect(response.body.hash)
      .toBeUndefined();
    expect(response.body.error)
      .toContain('Invalid token name');
    done();
  });

  it('should create a token successfully', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success)
      .toBe(true);
    expect(response.body.hash)
      .toBeDefined();
    done();
  });

  it('should send the created tokens to the correct address', async done => {
    const amountTokens = getRandomInt(100, 200);
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenB.name,
        symbol: tokenB.symbol,
        amount: amountTokens,
        address: await wallet1.getAddressAt(9)
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success)
      .toBe(true);

    const addr8 = await wallet1.getAddressInfo(9, transaction.hash);
    expect(addr8.total_amount_received)
      .toBe(amountTokens);
    done();
  });

  it('should send the change to the correct address', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenB.name,
        symbol: tokenB.symbol,
        amount: 100,
        change_address: await wallet2.getAddressAt(5)
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const transaction = response.body;
    expect(transaction.success)
      .toBe(true);
    const customTokenOutputIndex = TestUtils.getOutputIndexFromTx(transaction, 100);

    // If the custom token output is 0, the HTR will be on the output index 1. And vice-versa.
    const htrOutputIndex = customTokenOutputIndex === 1 ? 0 : 1;
    const htrChange = transaction.outputs[htrOutputIndex].value;

    const addr8 = await wallet1.getAddressInfo(5);
    expect(addr8.total_amount_received)
      .toBe(htrChange);
    done();
  });
});
