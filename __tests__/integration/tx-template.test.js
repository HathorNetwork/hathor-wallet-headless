import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('tx-template build', () => {
  let wallet;

  beforeAll(async () => {
    try {
      // Wallet with initial funds to send a transaction
      wallet = WalletHelper.getPrecalculatedWallet('tx-template');

      await WalletHelper.startMultipleWalletsForTest([wallet]);
      await wallet.injectFunds(100);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet.stop();
  });

  it('should not allow an invalid template', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/build')
      .send([
        { type: 'invalid-action' },
      ])
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail from a valid template with invalid data', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/build')
      .send([
        { type: 'action/setvar', name: 'addr', value: Array(34).fill('H').join('') },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 1, address: '{addr}' },
      ])
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should build a transaction from a valid template', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/build')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 1, address: '{addr}' },
      ])
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should build a transaction from a valid template sending query args', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/build')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 1, address: '{addr}' },
      ])
      .query({ debug: true })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should build a transaction that creates a token', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/build')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'action/config', tokenName: 'Test Token', tokenSymbol: 'TT', createToken: true },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 100, address: '{addr}', useCreatedToken: true },
      ])
      .query({ debug: true })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('tx-template run', () => {
  let wallet;
  let tokenId;

  beforeAll(async () => {
    try {
      // Wallet with initial funds to send a transaction
      wallet = WalletHelper.getPrecalculatedWallet('tx-template');

      await WalletHelper.startMultipleWalletsForTest([wallet]);
      await wallet.injectFunds(100);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet.stop();
  });

  it('should not allow an invalid template', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/run')
      .send([
        { type: 'invalid-action' },
      ])
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail from a valid template with invalid data', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/run')
      .send([
        { type: 'action/setvar', name: 'addr', value: Array(34).fill('H').join('') },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 1, address: '{addr}' },
      ])
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should build a transaction from a valid template', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/run')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 1, address: '{addr}' },
      ])
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
    await TestUtils.waitForTxReceived(wallet.walletId, response.body.hash);
  });

  it('should build a transaction from a valid template sending query args', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/run')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 1, address: '{addr}' },
      ])
      .query({ debug: true })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
    await TestUtils.waitForTxReceived(wallet.walletId, response.body.hash);
  });

  it('should build a transaction that creates a token', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/run')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'action/config', tokenName: 'Test Token', tokenSymbol: 'TT', createToken: true },
        { type: 'input/utxo', fill: 1 },
        { type: 'output/token', amount: 100, address: '{addr}', useCreatedToken: true },
        { type: 'output/authority', authority: 'mint', address: '{addr}', useCreatedToken: true },
      ])
      .query({ debug: true })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
    expect(response.body.version).toEqual(2);
    tokenId = response.body.hash;

    await TestUtils.waitForTxReceived(wallet.walletId, response.body.hash);

    const balance = await wallet.getBalance(tokenId);
    expect(balance.available).toEqual(100);
    const balanceHTR = await wallet.getBalance('00');
    expect(balanceHTR.available).toEqual(99);
  });

  it('should build a transaction that mint tokens', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-template/run')
      .send([
        { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
        { type: 'input/utxo', fill: 1 },
        { type: 'input/authority', authority: 'mint', token: tokenId },
        { type: 'output/token', amount: 100, address: '{addr}', token: tokenId },
        { type: 'output/authority', authority: 'mint', address: '{addr}', token: tokenId },
      ])
      .query({ debug: true })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
    expect(response.body.version).toEqual(1);

    await TestUtils.waitForTxReceived(wallet.walletId, response.body.hash);

    const balance = await wallet.getBalance(tokenId);
    expect(balance.available).toEqual(200);
    const balanceHTR = await wallet.getBalance('00');
    expect(balanceHTR.available).toEqual(98);
  });
});
