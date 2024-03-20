import { transactionUtils, constants, network, scriptsUtils } from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WALLET_CONSTANTS } from './configuration/test-constants';
import { WalletHelper } from './utils/wallet-helper';

describe('mint token', () => {
  let wallet1;
  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = WalletHelper.getPrecalculatedWallet('mint-token-1');

    // Starting the wallets
    await WalletHelper.startMultipleWalletsForTest([wallet1]);

    // Creating a token for the tests
    await wallet1.injectFunds(12, 0);
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

  it('should not mint an invalid token', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: 'invalidToken',
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);

    // TODO: Even though the result is correct, the error thrown is not related.
    // expect(response.body.message).toContain('invalid');
  });

  it('should not mint with an invalid address', async () => {
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
  });

  it('should not mint with an invalid change address', async () => {
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
  });

  it('should not mint with an invalid amount', async () => {
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
  });

  it('should not mint with change_address outside the wallet', async () => {
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
  });

  // Insufficient funds

  it('should not mint with insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 1000
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Not enough HTR tokens');
  });

  // Success

  it('should mint with destination address', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(1),
        amount: 50
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addr1 = await wallet1.getAddressInfo(1, tokenA.uid);
    expect(addr1.total_amount_available).toBe(50);
  });

  it('should mint with a change address', async () => {
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

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addr10 = await wallet1.getAddressInfo(10);
    expect(addr10.total_amount_received).toBe(htrChange);

    const tkaBalance = await wallet1.getBalance(tokenA.uid);
    expect(tkaBalance.available).toBe(500 + 50 + 60);
  });

  it('should mint with only mandatory parameters', async () => {
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

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addrNew = await TestUtils.getAddressInfo(
      destinationAddress,
      wallet1.walletId,
      tokenA.uid
    );
    expect(addrNew.total_amount_available).toBe(70);

    const tkaBalance = await wallet1.getBalance(tokenA.uid);
    expect(tkaBalance.available).toBe(500 + 50 + 60 + 70);
  });

  it('should mint with all parameters', async () => {
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

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addr15 = await wallet1.getAddressInfo(15, tokenA.uid);
    expect(addr15.total_amount_available).toBe(80);

    const addr14 = await wallet1.getAddressInfo(14);
    expect(addr14.total_amount_available).toBe(htrChange);
  });

  it('should mint and send mint output to the correct address', async () => {
    // By default, will mint tokens into the next unused address
    const address0 = await wallet1.getAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(16),
        mint_authority_address: address0,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);
    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const addr16 = await wallet1.getAddressInfo(16, tokenA.uid);
    expect(addr16.total_amount_available).toBe(100);

    // Validating a new mint authority was created by default
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isAuthorityOutput({ token_data: o.tokenData })
    );
    expect(authorityOutputs).toHaveLength(1);
    const authorityOutput = authorityOutputs[0];
    expect(authorityOutput.value).toEqual(constants.TOKEN_MINT_MASK);
    const p2pkh = scriptsUtils.parseP2PKH(Buffer.from(authorityOutput.script.data), network);
    // Validate that the authority output was sent to the correct address
    expect(p2pkh.address.base58).toEqual(address0);
  });

  it('should mint allowing external authority address', async () => {
    const externalAddress = TestUtils.getBurnAddress();
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(17),
        mint_authority_address: externalAddress,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);

    const response2 = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(17),
        mint_authority_address: externalAddress,
        allow_external_mint_authority_address: true,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response2.body;
    expect(transaction.success).toBe(true);
    await TestUtils.waitForTxReceived(wallet1.walletId, response2.body.hash);

    const addr17 = await wallet1.getAddressInfo(17, tokenA.uid);
    expect(addr17.total_amount_available).toBe(100);

    // Validating a new mint authority was created by default
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isAuthorityOutput({ token_data: o.tokenData })
    );
    expect(authorityOutputs).toHaveLength(1);
    const authorityOutput = authorityOutputs[0];
    expect(authorityOutput.value).toEqual(constants.TOKEN_MINT_MASK);
    const p2pkh = scriptsUtils.parseP2PKH(Buffer.from(authorityOutput.script.data), network);
    // Validate that the authority output was sent to the correct address
    expect(p2pkh.address.base58).toEqual(externalAddress);
  });
});
