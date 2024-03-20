import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('simple-send-tx (HTR)', () => {
  let wallet1;
  let wallet2;

  beforeAll(async () => {
    try {
      // Wallet with initial funds to send a transaction
      wallet1 = WalletHelper.getPrecalculatedWallet('simple-tx-1');
      // Empty wallet to receive transactions and validate tests
      wallet2 = WalletHelper.getPrecalculatedWallet('simple-tx-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
      await wallet1.injectFunds(1000);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  // Testing all transaction failures first, to have a easier starting test scenario

  it('should not allow a transaction with an invalid value', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 'invalidValue',
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    // It would be good to have a error message assertion
  });

  it('should not allow a transaction with a negative value', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: -1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('value');
  });

  it('should not allow a transaction with an invalid address', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: 'invalidAddress',
        value: 500,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid base58 address');
  });

  it('should not allow a transaction with an invalid change address', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 500,
        change_address: 'invalidChangeAddress',
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address');
  });

  it('should not allow a transaction with a change address outside the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 500,
        change_address: wallet2.getAddressAt(2),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);

    const transaction = response.body;
    expect(transaction.success).toBe(false);
    const errorElement = transaction.error[0];
    expect(errorElement).toHaveProperty('param', 'change_address');
    expect(errorElement.msg).toContain('Invalid');
  });

  it('should not allow a transaction with insufficient balance', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 2000,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Insufficient');
  });

  // Executing all successful transactions

  it('should make a successful transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 200,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.outputs).toHaveLength(2);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response.body.hash);

    const addr0 = await wallet2.getAddressInfo(0);
    expect(addr0.total_amount_available).toBe(200);

    const balance1 = await wallet1.getBalance();
    expect(balance1.available).toBe(800);
  });

  it('should make a successful transaction with change address', async () => {
    const changeAddress = await wallet1.getAddressAt(5);

    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 200,
        change_address: changeAddress,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.outputs).toHaveLength(2);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response.body.hash);

    // Check if the transaction arrived at the correct address

    // The wallet1 started with 1000, transferred 400 to wallet2. Change should be 600
    const addr5 = await wallet1.getAddressInfo(5);
    expect(addr5.total_amount_received).toBe(600);

    const addr0 = await wallet2.getAddressInfo(0);
    expect(addr0.total_amount_available).toBe(400);
  });
});

describe('simple-send-tx (custom token)', () => {
  let wallet3;
  let wallet4;
  const tokenData = {
    name: 'SimpleTx Token',
    symbol: 'STX',
    uid: undefined,
  };

  beforeAll(async () => {
    try {
      // Wallet with initial 1000 Custom Token funds
      wallet3 = WalletHelper.getPrecalculatedWallet('simple-tx-3');
      // Empty wallet to receive transactions and validate tests
      wallet4 = WalletHelper.getPrecalculatedWallet('simple-tx-4');

      await WalletHelper.startMultipleWalletsForTest([wallet3, wallet4]);
      await wallet3.injectFunds(10);
      const tokenResponse = await wallet3.createToken({
        amount: 1000,
        name: tokenData.name,
        symbol: tokenData.symbol,
        doNotWait: true,
      });
      tokenData.uid = tokenResponse.hash;
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet3.stop();
    await wallet4.stop();
  });

  // Testing all transaction failures first, to have a easier starting test scenario

  it('should not allow a transaction with an invalid value', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: 'invalidValue',
        token: tokenData.hash,
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    // It would be good to have a error message assertion
  });

  it('should not allow a transaction with a negative value', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: -1,
        token: tokenData.hash,
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.text).toContain('value');
  });

  it('should not allow a transaction with an invalid address', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: 'invalidAddress',
        value: 300,
        token: tokenData.uid,
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid');
  });

  it('should not allow a transaction with an invalid change address', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: 300,
        token: tokenData.uid,
        change_address: 'invalidChangeAddress',
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address');
  });

  it('should not allow a transaction with a change address outside the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: 300,
        token: tokenData.uid,
        change_address: await wallet4.getAddressAt(2),
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(false);
    expect(transaction.error).toContain('Change address');
  });

  it('should not allow a transaction with insufficient balance', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: 3000,
        token: tokenData.uid,
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Insufficient');
  });

  it('should should make a successful transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: 300,
        token: tokenData.uid,
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.outputs).toHaveLength(2);

    await TestUtils.waitForTxReceived(wallet3.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet4.walletId, response.body.hash);

    const addr0 = await wallet4.getAddressInfo(0, tokenData.uid);
    expect(addr0.total_amount_available).toBe(300);

    const balance3 = await wallet3.getBalance(tokenData.uid);
    expect(balance3.available).toBe(700);
  });

  it('should should make a successful transaction with change address', async () => {
    const changeAddress = await wallet3.getAddressAt(5);

    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet4.getAddressAt(0),
        value: 300,
        token: tokenData.uid,
        change_address: changeAddress
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.outputs).toHaveLength(2);

    await TestUtils.waitForTxReceived(wallet3.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet4.walletId, response.body.hash);

    // Check if the transaction arrived at the correct address

    // The wallet1 started with 1000, transferred 600 to wallet2. Change should be 400
    const addr5 = await wallet3.getAddressInfo(5, tokenData.uid);
    expect(addr5.total_amount_received).toBe(400);

    const addr0 = await wallet4.getAddressInfo(0, tokenData.uid);
    expect(addr0.total_amount_available).toBe(600);
  });
});
