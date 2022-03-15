import { getRandomInt, TestUtils, WALLET_CONSTANTS } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('create token', () => {
  let wallet1;
  let wallet2;

  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = new WalletHelper('create-token-1');
    wallet2 = new WalletHelper('create-token-2');

    await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
    await wallet1.injectFunds(10, 0);
    await wallet1.injectFunds(10, 1);
    await wallet2.injectFunds(10, 0);
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
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

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
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

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    done();
  });

  it.skip('should reject a name with more than 30 characters', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Name input with more than 30 characters',
        symbol: tokenA.symbol,
        amount: 2000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('maximum size');
    done();
  });

  // The result is an error with the message "maximum size", but consumes the funds. Must be fixed.
  it.skip('should reject a symbol with more than 5 characters', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: 'TKABCD',
        amount: 2000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('maximum size');
    done();
  });

  it('should reject an invalid destination address', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 1000,
        address: 'invalidAddress'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('base58');
    done();
  });

  it('should reject an invalid change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 500,
        address: await wallet1.getAddressAt(0),
        change_address: 'invalidAddress'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address');
    done();
  });

  // The application is incorrectly allowing external addresses to receive the change
  it.skip('should reject creating token for change address not in the wallet', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 500,
        address: await wallet1.getAddressAt(0),
        change_address: WALLET_CONSTANTS.genesis.addresses[3]
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('wallet');
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

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
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

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.error).toContain('Invalid token name');
    done();
  });

  it('should create a token with only required parameters', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();

    await TestUtils.pauseForWsUpdate();

    const htrBalance = await wallet1.getBalance();
    const tkaBalance = await wallet1.getBalance(response.body.hash);
    expect(htrBalance.available).toBe(19); // The initial 20 minus 1
    expect(tkaBalance.available).toBe(100); // The newly minted TKA tokens
    done();
  });

  it('should send the created tokens to the correct address', async done => {
    const amountTokens = getRandomInt(100, 200);
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token B',
        symbol: 'TKB',
        amount: amountTokens,
        address: await wallet1.getAddressAt(9)
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const addr9 = await wallet1.getAddressInfo(9, transaction.hash);
    expect(addr9.total_amount_received).toBe(amountTokens);
    done();
  });

  it('should send the change to the correct address', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token C',
        symbol: 'TKC',
        amount: 100,
        change_address: await wallet2.getAddressAt(5)
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);

    // The only output with token_data equals zero is the one containing the HTR change
    const htrOutputIndex = transaction.outputs.findIndex(o => o.token_data === 0);
    const htrChange = transaction.outputs[htrOutputIndex].value;

    await TestUtils.pauseForWsUpdate();

    const addr5 = await wallet2.getAddressInfo(5);
    expect(addr5.total_amount_received).toBe(htrChange);
    done();
  });

  it('should create a token with all available inputs', async done => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token D',
        symbol: 'TKD',
        amount: 200,
        address: await wallet2.getAddressAt(4),
        change_address: await wallet2.getAddressAt(4)
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);

    // The only output with token_data equals zero is the one containing the HTR change
    const htrOutputIndex = transaction.outputs.findIndex(o => o.token_data === 0);
    const htrChange = transaction.outputs[htrOutputIndex].value;

    await TestUtils.pauseForWsUpdate();

    const addr4 = await wallet2.getAddressInfo(4);
    expect(addr4.total_amount_received).toBe(htrChange);
    const addr4C = await wallet2.getAddressInfo(4, transaction.hash);
    expect(addr4C.total_amount_available).toBe(200);
    done();
  });
});
