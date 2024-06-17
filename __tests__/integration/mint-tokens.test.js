import { transactionUtils, constants, network, scriptsUtils, ScriptData } from '@hathor/wallet-lib';
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
    await wallet1.injectFunds(20, 0);
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
  // Current funds: 15 HTR + 500 TKA

  it('should not mint with insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 1600
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

    // Current funds: 14 HTR + 550 TKA

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

    // Current funds: 13 HTR + 610 TKA

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

    // Current funds: 12 HTR + 680 TKA

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

    // Current funds: 11 HTR + 760 TKA

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

    // Current funds: 10 HTR + 860 TKA

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

  it('should mint and create data outputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 100,
        data: ['foobar1', 'foobar2'],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Current funds: 9 HTR + 960 TKA

    const transaction = response.body;
    expect(transaction.success).toBe(true);
    // If unshift_data is not specified, the data output will be the first output
    const dataOutput1 = transaction.outputs[1];
    const dataOutput2 = transaction.outputs[0];

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    console.log(`Data output foobar1: ${JSON.stringify(dataOutput1)}`);
    console.log(`Data output foobar2: ${JSON.stringify(dataOutput2)}`);
    const script1 = Array.from((new ScriptData('foobar1')).createScript());
    const script2 = Array.from((new ScriptData('foobar2')).createScript());

    expect(dataOutput1.token_data).toBe(0);
    expect(dataOutput1.value).toBe(1);
    expect(dataOutput1.script.data).toEqual(script1);

    expect(dataOutput2.token_data).toBe(0);
    expect(dataOutput2.value).toBe(1);
    expect(dataOutput2.script.data).toEqual(script2);
  });

  it('should mint and create a data output at first position', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 100,
        data: ['foobar'],
        unshift_data: false,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Current funds: 9 HTR + 960 TKA

    const transaction = response.body;
    expect(transaction.success).toBe(true);
    const dataOutput = transaction.outputs[transaction.outputs.length - 1];
    const script = Array.from((new ScriptData('foobar')).createScript());

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    console.log(JSON.stringify(dataOutput));
    expect(dataOutput.token_data).toBe(0);
    expect(dataOutput.value).toBe(1);
    expect(dataOutput.script.data).toEqual(script);
  });

  it('should mint allowing external authority address', async () => {
    // XXX: This test should be the last test since it sends the mint authority to the burn address
    const externalAddress = TestUtils.getBurnAddress();
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(20),
        mint_authority_address: externalAddress,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);

    // The following request loses the mint authority
    const response2 = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: tokenA.uid,
        address: await wallet1.getAddressAt(20),
        mint_authority_address: externalAddress,
        allow_external_mint_authority_address: true,
        amount: 100
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response2.body;
    expect(transaction.success).toBe(true);
    await TestUtils.waitForTxReceived(wallet1.walletId, response2.body.hash);

    const addr17 = await wallet1.getAddressInfo(20, tokenA.uid);
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
