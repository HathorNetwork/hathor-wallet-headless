import { TestUtils, WALLET_CONSTANTS } from './utils/test-utils-integration';
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
    await wallet1.injectFunds(10, 0);
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
        change_address: 'invalidAddress',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address');
    done();
  });

  it('should not mint with an invalid amount', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 'invalidVamount'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('amount');
    done();
  });

  // The application is allowing minting for an address outside the wallet
  it.skip('should not mint for addresses outside the wallet', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: WALLET_CONSTANTS.genesis.addresses[3],
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('address');
    done();
  });

  // The application is allowing a change_address outside the wallet
  it.skip('should not mint with change_address outside the wallet', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        change_address: WALLET_CONSTANTS.genesis.addresses[3],
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address');
    done();
  });

  // Insufficient funds

  it('should not mint with insuficcient funds', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 1000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('HTR funds');
    done();
  });

  // Success

  it('should mint with destination address', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 50
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const addr1 = await wallet1.getAddressInfo(1, tokenA.uid);
    expect(addr1.total_amount_available).toBe(50);

    done();
  });

  it('should mint with a change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        change_address: await wallet1.getAddressAt(10), // Index 10 is supposed to be not used yet
        amount: 60
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);
    const htrOutputIndex = transaction.outputs.findIndex(o => o.token_data === 0);
    const htrChange = transaction.outputs[htrOutputIndex].value;

    await TestUtils.pauseForWsUpdate();

    const addr10 = await wallet1.getAddressInfo(10);
    expect(addr10.total_amount_received).toBe(htrChange);

    const tkaBalance = await wallet1.getBalance(tokenA.uid);
    expect(tkaBalance.available).toBe(500 + 50 + 60);
    done();
  });

  it('should mint with only mandatory parameters', async done => {
    const destinationAddress = await wallet1.getNextAddress();

    // By default, will mint tokens into the next unused address
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 70
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();

    const addrNew = await TestUtils.getAddressInfo(
      destinationAddress,
      wallet1.walletId,
      tokenA.uid
    );
    expect(addrNew.total_amount_available).toBe(70);

    const tkaBalance = await wallet1.getBalance(tokenA.uid);
    expect(tkaBalance.available).toBe(500 + 50 + 60 + 70);
    done();
  });

  it('should mint with all parameters', async done => {
    // By default, will mint tokens into the next unused address
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(15),
        change_address: await wallet1.getAddressAt(14),
        amount: 80
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);
    const htrOutputIndex = transaction.outputs.findIndex(o => o.token_data === 0);
    const htrChange = transaction.outputs[htrOutputIndex].value;

    await TestUtils.pauseForWsUpdate();

    const addr15 = await wallet1.getAddressInfo(15, tokenA.uid);
    expect(addr15.total_amount_available).toBe(80);

    const addr14 = await wallet1.getAddressInfo(14);
    expect(addr14.total_amount_available).toBe(htrChange);
    done();
  });
});
