import { tokensUtils, transactionUtils, constants, network, scriptsUtils } from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { AUTHORITY_VALUE, TOKEN_DATA } from './configuration/test-constants';
import { WalletHelper } from './utils/wallet-helper';

describe('create-nft routes', () => {
  /** @type WalletHelper */
  let wallet1;
  let wallet2;

  const nftData = {
    name: 'Test NFT',
    symbol: 'TNFT',
    data: 'ipfs://ipfs/bafybeigu4pynylpbces2eq6hw6kflpjuagqkbqpawa7hrdnm5stzpyuwwe/'
  };

  beforeAll(async () => {
    wallet1 = WalletHelper.getPrecalculatedWallet('create-nft-1');
    wallet2 = WalletHelper.getPrecalculatedWallet('create-nft-2');

    await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);

    await wallet1.injectFunds(1010);
  });

  it('should reject without the mandatory parameters', async () => {
    for (const field of ['name', 'symbol', 'amount', 'data']) {
      const token = {
        ...nftData,
        amount: 1000,
      };
      delete token[field];

      const response = await TestUtils.request
        .post('/wallet/create-nft')
        .send(token)
        .set({ 'x-wallet-id': wallet1.walletId });

      expect(response.status).toBe(400);
      expect(response.text).toContain(field);
    }
  });

  it('should reject for insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1000,
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.body.success).toBe(false);
    expect(response.text).toContain('HTR tokens');
  });

  it('should reject for a change address outside of the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 10,
        change_address: await wallet2.getAddressAt(0),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);
    expect(response.text).toContain('Change address');
  });

  it('should create nft with only mandatory parameters', async () => {
    const htrBalanceBefore = await wallet1.getBalance();
    const nextAddress = await wallet1.getNextAddress();

    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    expect(response.body.success).toBe(true);
    const nftTx = response.body;
    expect(nftTx.hash).toBeDefined();
    expect(nftTx.configurationString)
      .toBe(tokensUtils.getConfigurationString(nftTx.hash, nftData.name, nftData.symbol));

    const configStringResponse = await TestUtils.getConfigurationString(nftTx.hash);
    expect(nftTx.configurationString).toBe(configStringResponse.configurationString);

    // No authority tokens
    for (const output of nftTx.outputs) {
      expect(TOKEN_DATA.isAuthorityToken(output.token_data)).toBe(false);
    }

    // Validating that the NFT fee is the first output
    expect(nftTx.outputs[0].value).toBe(1);
    expect(nftTx.outputs[0].token_data).toBe(0);

    // The fees (1) and deposits (1) should be deducted
    const htrBalanceAfter = await wallet1.getBalance();
    expect(htrBalanceAfter.available).toBe(htrBalanceBefore.available - 2);

    // NFT should be on the next available address
    const addrInfo = await TestUtils.getAddressInfo(nextAddress, wallet1.walletId, nftTx.hash);
    expect(addrInfo.total_amount_available).toBe(1);
  });

  it('should create nft with address and change address', async () => {
    const destAddr = await wallet1.getNextAddress(true);
    const changeAddr = await wallet1.getNextAddress(true);

    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        address: destAddr,
        change_address: changeAddr
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    expect(response.body.success).toBe(true);
    const nftTx = response.body;
    expect(nftTx.hash).toBeDefined();

    // No authority tokens
    let changeAmount;
    for (const output of nftTx.outputs) {
      expect(
        output.token_data === TOKEN_DATA.HTR
        || output.token_data === TOKEN_DATA.TOKEN
      ).toBe(true);

      // Fetching the change amount from the tx outputs ( htr output that is not the fee )
      if (output.token_data === TOKEN_DATA.HTR && output.value !== 1) {
        changeAmount = output.value;
      }
    }

    // Validating balances for target addresses
    const destInfo = await TestUtils.getAddressInfo(destAddr, wallet1.walletId, nftTx.hash);
    expect(destInfo.total_amount_available).toBe(1);
    const changeInfo = await TestUtils.getAddressInfo(changeAddr, wallet1.walletId);
    expect(changeInfo.total_amount_available).toBe(changeAmount);
  });

  it('should create nft with mint authority', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_mint: true
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    const nftTx = response.body;

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    expect(nftTx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = nftTx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.token_data));
    expect(authorityOutputs.length).toBe(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);
  });

  it('should create nft with melt authority', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_melt: true
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    const nftTx = response.body;

    expect(nftTx.hash).toBeDefined();

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    // Validating authority tokens
    const authorityOutputs = nftTx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.token_data));
    expect(authorityOutputs.length).toBe(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);
  });

  it('should create nft with mint and melt authorities', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_melt: true,
        create_mint: true
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    const nftTx = response.body;

    expect(nftTx.hash).toBeDefined();

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    // Validating authority tokens
    const authorityOutputs = nftTx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.token_data));
    expect(authorityOutputs.length).toBe(2);
    expect(authorityOutputs.find(o => o.value === AUTHORITY_VALUE.MINT)).toBeTruthy();
    expect(authorityOutputs.find(o => o.value === AUTHORITY_VALUE.MELT)).toBeTruthy();
  });

  it('should create the NFT and send authority outputs to the correct address', async () => {
    // By default, will mint tokens into the next unused address
    const address0 = await wallet1.getAddressAt(0);
    const address1 = await wallet1.getAddressAt(1);
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_mint: true,
        mint_authority_address: address0,
        create_melt: true,
        melt_authority_address: address1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const transaction = response.body;
    expect(transaction.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    // Validating a new mint authority was created
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isAuthorityOutput({ token_data: o.tokenData })
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
  });

  it('Create nft using external mint/melt address', async () => {
    const address2idx0 = await wallet2.getAddressAt(0);
    const address2idx1 = await wallet2.getAddressAt(1);

    // External address for mint won't be successful
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_mint: true,
        mint_authority_address: address2idx0,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);

    // External address for melt won't be successful
    const response2 = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_melt: true,
        melt_authority_address: address2idx1,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response2.body.success).toBe(false);

    // External address for both authorities will succeed with parameter allowing it
    const response3 = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        ...nftData,
        amount: 1,
        create_mint: true,
        mint_authority_address: address2idx0,
        allow_external_mint_authority_address: true,
        create_melt: true,
        melt_authority_address: address2idx1,
        allow_external_melt_authority_address: true,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response3.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response3.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response3.body.hash);

    const transaction = response3.body;

    // Validating a new mint authority was created
    const authorityOutputs = transaction.outputs.filter(
      o => transactionUtils.isAuthorityOutput({ token_data: o.tokenData })
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
  });
});
