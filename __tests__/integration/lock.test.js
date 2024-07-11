import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import constants from '../../src/helpers/constants';

const { cantSendTxErrorMessage } = constants;

describe('Wallet lock behavior', () => {
  let wallet1;
  let wallet2;

  beforeAll(async () => {
    try {
      wallet1 = WalletHelper.getPrecalculatedWallet('lock-wallet-tx-1');
      wallet2 = WalletHelper.getPrecalculatedWallet('lock-wallet-tx-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
      await wallet1.injectFunds(1000);
      await wallet2.injectFunds(1000);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should not allow multiple transactions from the same wallet', async () => {
    // Wallet 1 sends 0.01 HTR to Wallet 2
    const promise1 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Wallet 1 sends 0.01 HTR to Wallet 2 and will be blocked
    const promise2 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);

    // Check if the transaction was sent

    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(true);
    expect(response1.body.hash).toBeDefined();

    // Await the transaction to arrive

    await TestUtils.waitForTxReceived(wallet1.walletId, response1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response1.body.hash);

    // Check that the second transaction was blocked

    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(false);
    expect(response2.body.error).toContain(cantSendTxErrorMessage);
  });

  it('should not allow multiple transactions from different operations from the same wallet', async () => {
    // Wallet 1 sends 0.01 HTR to Wallet 2
    const promise1 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Wallet 1 tries to create a new token
    const promise2 = TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token that wont exist',
        symbol: 'TkTWE',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);

    // Check if the transaction was sent

    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(true);
    expect(response1.body.hash).toBeDefined();

    // Await the transaction to arrive

    await TestUtils.waitForTxReceived(wallet1.walletId, response1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response1.body.hash);

    // Check that the second transaction was blocked

    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(false);
    expect(response2.body.error).toContain(cantSendTxErrorMessage);
  });

  it('should allow multiple transactions from different wallets at the same time', async () => {
    // Wallet 1 sends 0.01 HTR to Wallet 2
    const promise1 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Wallet 2 sends 0.01 HTR to Wallet 1
    const promise2 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet1.getAddressAt(0),
        value: 1,
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);

    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(true);
    expect(response1.body.hash).toBeDefined();

    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(true);
    expect(response2.body.hash).toBeDefined();

    await TestUtils.waitForTxReceived(wallet1.walletId, response1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response1.body.hash);

    await TestUtils.waitForTxReceived(wallet1.walletId, response2.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response2.body.hash);
  });

  it('should allow multiple transactions from different operations from different wallets at the same time', async () => {
    // Wallet 1 sends 0.01 HTR to Wallet 2
    const promise1 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Wallet 2 creates a new token
    const promise2 = TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);

    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(true);
    expect(response1.body.hash).toBeDefined();

    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(true);
    expect(response2.body.hash).toBeDefined();

    await TestUtils.waitForTxReceived(wallet1.walletId, response1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response1.body.hash);

    // new token is only on wallet2
    await TestUtils.waitForTxReceived(wallet2.walletId, response2.body.hash);
  });

  it('should allow different wallets to work independently no matter the operation', async () => {
    // 1. Create a new token on each wallet

    let promise1 = TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token A',
        symbol: 'TKA',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    let promise2 = TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token B',
        symbol: 'TKB',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const [response1o1, response1o2] = await Promise.all([promise1, promise2]);

    expect(response1o1.status).toBe(200);
    expect(response1o1.body.success).toBe(true);
    expect(response1o1.body.hash).toBeDefined();
    const tokenA = response1o1.body.hash;

    expect(response1o2.status).toBe(200);
    expect(response1o2.body.success).toBe(true);
    expect(response1o2.body.hash).toBeDefined();
    const tokenB = response1o2.body.hash;

    // wait for the token on each wallet
    await TestUtils.waitForTxReceived(wallet1.walletId, tokenA);
    await TestUtils.waitForTxReceived(wallet2.walletId, tokenB);

    // 2. Mint new tokens on each wallet

    promise1 = TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    promise2 = TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenB,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const [response2o1, response2o2] = await Promise.all([promise1, promise2]);

    expect(response2o1.status).toBe(200);
    expect(response2o1.body.success).toBe(true);
    expect(response2o1.body.hash).toBeDefined();

    expect(response2o2.status).toBe(200);
    expect(response2o2.body.success).toBe(true);
    expect(response2o2.body.hash).toBeDefined();

    // wait for the token on each wallet
    await TestUtils.waitForTxReceived(wallet1.walletId, response2o1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response2o2.body.hash);

    // 3. Melt tokens on each wallet

    promise1 = TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA,
        amount: 100,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    promise2 = TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenB,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const [response3o1, response3o2] = await Promise.all([promise1, promise2]);

    expect(response3o1.status).toBe(200);
    expect(response3o1.body.success).toBe(true);
    expect(response3o1.body.hash).toBeDefined();

    expect(response3o2.status).toBe(200);
    expect(response3o2.body.success).toBe(true);
    expect(response3o2.body.hash).toBeDefined();

    // wait for the token on each wallet
    await TestUtils.waitForTxReceived(wallet1.walletId, response3o1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response3o2.body.hash);

    // 4. Send tokens to the other wallet

    promise1 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet2.getAddressAt(0),
        value: 100,
        token: tokenA,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    promise2 = TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: await wallet1.getAddressAt(0),
        value: 100,
        token: tokenB
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    const [response4o1, response4o2] = await Promise.all([promise1, promise2]);

    expect(response4o1.status).toBe(200);
    expect(response4o1.body.success).toBe(true);
    expect(response4o1.body.hash).toBeDefined();

    expect(response4o2.status).toBe(200);
    expect(response4o2.body.success).toBe(true);
    expect(response4o2.body.hash).toBeDefined();

    // wait for the token on each wallet
    await TestUtils.waitForTxReceived(wallet1.walletId, response4o1.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response4o1.body.hash);
    await TestUtils.waitForTxReceived(wallet1.walletId, response4o2.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response4o2.body.hash);
  });
});
