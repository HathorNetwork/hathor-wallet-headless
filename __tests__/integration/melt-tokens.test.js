import { transactionUtils, constants, network, scriptsUtils } from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WALLET_CONSTANTS } from './configuration/test-constants';
import { WalletHelper } from './utils/wallet-helper';

describe('melt tokens', () => {
  let wallet1;
  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = WalletHelper.getPrecalculatedWallet('melt-token-1');

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

  it('should not melt an invalid token', async () => {
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
  });

  it('should not melt with an invalid amount', async () => {
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
  });

  it('should not melt with zero amount', async () => {
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
  });

  it('should not melt with a negative amount', async () => {
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
  });

  it('should not melt with an invalid deposit_address', async () => {
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
    expect(response.text).toContain('Invalid');
  });

  it('should not melt with an invalid change_address', async () => {
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
    expect(response.text).toContain('Change address is not from this wallet');
  });

  it('should not melt with a change_address outside the wallet', async () => {
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
    expect(response.text).toContain('Change address is not from this wallet');
  });

  // Insufficient funds

  it('should not melt with insufficient tokens', async () => {
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
    expect(response.body.error).toContain('enough tokens to melt');
  });

  // Success

  it('should melt with address and change address', async () => {
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

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

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
  });

  it('should melt with deposit address only', async () => {
    // There is an issue of how change addresses are chosen on the lib
    // Since address at index 4 was used the change address for the next operation
    // will be the address at index 5, meaning that if we chose the address at 5
    // we would be sending the change to the same address
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 100,
        deposit_address: await wallet1.getAddressAt(6),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addr6htr = await wallet1.getAddressInfo(6);
    const addr6tka = await wallet1.getAddressInfo(6, tokenA.uid);
    expect(addr6htr.total_amount_available).toBe(1);
    expect(addr6tka.total_amount_available).toBe(0);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3 + 1);
    expect(balance1tka.available).toBe(800 - 300 - 100);
  });

  it('should melt with change address only', async () => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 100,
        change_address: await wallet1.getAddressAt(8),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addr8htr = await wallet1.getAddressInfo(8);
    const addr8tka = await wallet1.getAddressInfo(8, tokenA.uid);
    expect(addr8htr.total_amount_available).toBe(0);
    expect(addr8tka.total_amount_available).toBe(300);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3 + 1 + 1);
    expect(balance1tka.available).toBe(800 - 300 - 100 - 100);
  });

  it('should melt with mandatory parameters', async () => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(2 + 3 + 1 + 1 + 1); // 8
    expect(balance1tka.available).toBe(800 - 300 - 100 - 100 - 100); // 200
  });

  it('should not retrieve funds when melting below 100 tokens', async () => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 50
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(8);
    expect(balance1tka.available).toBe(150);
  });

  it('should retrieve funds rounded down when not melting multiples of 100', async () => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(9);
    expect(balance1tka.available).toBe(50);
  });

  it('should melt and send melt output to the correct address', async () => {
    const address0 = await wallet1.getAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(16),
        melt_authority_address: address0,
        amount: 30
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);
    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(9);
    expect(balance1tka.available).toBe(20);

    // Validating a new melt authority was created by default
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isAuthorityOutput({ token_data: o.tokenData })
    );
    expect(authorityOutputs).toHaveLength(1);
    const authorityOutput = authorityOutputs[0];
    expect(authorityOutput.value).toEqual(constants.TOKEN_MELT_MASK);
    const p2pkh = scriptsUtils.parseP2PKH(Buffer.from(authorityOutput.script.data), network);
    // Validate that the authority output was sent to the correct address
    expect(p2pkh.address.base58).toEqual(address0);
  });

  it('should melt allowing external authority address', async () => {
    const externalAddress = TestUtils.getBurnAddress();
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(17),
        melt_authority_address: externalAddress,
        amount: 20
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);

    const response2 = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(17),
        melt_authority_address: externalAddress,
        allow_external_melt_authority_address: true,
        amount: 20
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response2.body;
    expect(transaction.success).toBe(true);
    await TestUtils.waitForTxReceived(wallet1.walletId, response2.body.hash);

    const balance1htr = await wallet1.getBalance();
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1htr.available).toBe(9);
    expect(balance1tka.available).toBe(0);

    // Validating a new melt authority was created by default
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isAuthorityOutput({ token_data: o.tokenData })
    );
    expect(authorityOutputs).toHaveLength(1);
    const authorityOutput = authorityOutputs[0];
    expect(authorityOutput.value).toEqual(constants.TOKEN_MELT_MASK);
    const p2pkh = scriptsUtils.parseP2PKH(Buffer.from(authorityOutput.script.data), network);
    // Validate that the authority output was sent to the correct address
    expect(p2pkh.address.base58).toEqual(externalAddress);
  });
});
