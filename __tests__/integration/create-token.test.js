import { tokensUtils, transaction as transactionUtils, constants, network, scriptsUtils } from '@hathor/wallet-lib';
import { getRandomInt } from './utils/core.util';
import { TestUtils } from './utils/test-utils-integration';
import { WALLET_CONSTANTS } from './configuration/test-constants';
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
    wallet1 = WalletHelper.getPrecalculatedWallet('create-token-1');
    wallet2 = WalletHelper.getPrecalculatedWallet('create-token-2');

    await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
    await wallet1.injectFunds(10, 0);
    await wallet1.injectFunds(10, 1);
    await wallet1.injectFunds(10, 2);
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

  // insufficient funds

  it('should reject for insufficient funds', async done => {
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
    expect(response.body.configurationString)
      .toBe(tokensUtils.getConfigurationString(response.body.hash, tokenA.name, tokenA.symbol));

    const configStringResponse = await TestUtils.getConfigurationString(response.body.hash);
    expect(response.body.success).toBe(true);
    expect(response.body.configurationString).toBe(configStringResponse.configurationString);

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

  it('should create token with only mint authority', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_mint: true,
        create_melt: false
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    const tx = response.body;

    expect(tx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = tx.outputs.filter(
      o => transactionUtils.isTokenDataAuthority(o.tokenData)
    );
    expect(authorityOutputs.length).toBe(1);
    expect(authorityOutputs[0].value).toBe(constants.TOKEN_MINT_MASK);
  });

  it('should create token with only melt authority', async () => {
    // Since no pause was necessary on the last test, we will add one here to improve stability
    await TestUtils.pauseForWsUpdate();

    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_mint: false,
        create_melt: true
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    const tx = response.body;

    expect(tx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = tx.outputs.filter(
      o => transactionUtils.isTokenDataAuthority(o.tokenData)
    );
    expect(authorityOutputs.length).toBe(1);
    expect(authorityOutputs[0].value).toBe(constants.TOKEN_MELT_MASK);
  });

  it('should create token with mint and melt authorities', async () => {
    await TestUtils.pauseForWsUpdate();
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_mint: true,
        create_melt: true
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    const tx = response.body;

    expect(tx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = tx.outputs.filter(
      o => transactionUtils.isTokenDataAuthority(o.tokenData)
    );
    expect(authorityOutputs.length).toBe(2);
    expect(authorityOutputs.find(o => o.value === constants.TOKEN_MINT_MASK)).toBeTruthy();
    expect(authorityOutputs.find(o => o.value === constants.TOKEN_MELT_MASK)).toBeTruthy();
  });

  it('should create the token and send authority outputs to the correct address', async done => {
    // By default, will mint tokens into the next unused address
    const address0 = await wallet1.getAddressAt(0);
    const address1 = await wallet1.getAddressAt(1);
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_mint: true,
        mint_authority_address: address0,
        create_melt: true,
        melt_authority_address: address1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);

    // Validating a new mint authority was created
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isTokenDataAuthority(o.tokenData)
    );
    expect(authorityOutputs).toHaveLength(2);
    const mintOutput = authorityOutputs.filter(
      o => o.value === constants.TOKEN_MINT_MASK
    );
    const mintP2pkh = scriptsUtils.parseP2PKH(Buffer.from(mintOutput[0].script.data), network);
    // Validate that the mint output was sent to the correct address
    expect(mintP2pkh.address.base58).toEqual(address0);

    const meltOutput = authorityOutputs.filter(
      o => o.value === constants.TOKEN_MELT_MASK
    );
    const meltP2pkh = scriptsUtils.parseP2PKH(Buffer.from(meltOutput[0].script.data), network);
    // Validate that the melt output was sent to the correct address
    expect(meltP2pkh.address.base58).toEqual(address1);

    done();
  });

  it('Create token using external mint/melt address', async done => {
    const address2idx0 = await wallet2.getAddressAt(0);
    const address2idx1 = await wallet2.getAddressAt(1);

    // External address for mint won't be successful
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_mint: true,
        mint_authority_address: address2idx0,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);

    // External address for melt won't be successful
    const response2 = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_melt: true,
        melt_authority_address: address2idx1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response2.body.success).toBe(false);

    // External address for both authorities will succeed with parameter allowing it
    const response3 = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Token X',
        symbol: 'TKX',
        amount: 100,
        create_mint: true,
        mint_authority_address: address2idx0,
        allow_external_mint_authority_address: true,
        create_melt: true,
        melt_authority_address: address2idx1,
        allow_external_melt_authority_address: true,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response3.body.success).toBe(true);

    const transaction = response3.body;
    expect(transaction.success).toBe(true);

    // Validating a new mint authority was created
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isTokenDataAuthority(o.tokenData)
    );
    expect(authorityOutputs).toHaveLength(2);
    const mintOutput = authorityOutputs.filter(
      o => o.value === constants.TOKEN_MINT_MASK
    );
    const mintP2pkh = scriptsUtils.parseP2PKH(Buffer.from(mintOutput[0].script.data), network);
    // Validate that the mint output was sent to the correct address
    expect(mintP2pkh.address.base58).toEqual(address2idx0);

    const meltOutput = authorityOutputs.filter(
      o => o.value === constants.TOKEN_MELT_MASK
    );
    const meltP2pkh = scriptsUtils.parseP2PKH(Buffer.from(meltOutput[0].script.data), network);
    // Validate that the melt output was sent to the correct address
    expect(meltP2pkh.address.base58).toEqual(address2idx1);

    done();
  });
});
