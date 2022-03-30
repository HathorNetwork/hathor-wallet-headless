import { AUTHORITY_VALUE, TestUtils, TOKEN_DATA } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('create-nft routes', () => {
  /** @type WalletHelper */
  let wallet1;
  let wallet2;

  const nftData = {
    name: 'Test NFT',
    symbol: 'TNFT',
    data: 'ipfs://bafybeigu4pynylpbces2eq6hw6kflpjuagqkbqpawa7hrdnm5stzpyuwwe/'
  };

  beforeAll(async () => {
    wallet1 = new WalletHelper('create-nft-1');
    wallet2 = new WalletHelper('create-nft-2');

    await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);

    await wallet1.injectFunds(1010);
    await TestUtils.pauseForWsUpdate();
  });

  /*
   * There are some varying behaviours on the token tests, mapped on issue #161.
   * To avoid problems with them, we add a delay between each test - even the "invalid" ones that
   * should not have side effects.
   */
  beforeEach(async () => {
    await TestUtils.pauseForWsUpdate();
  });

  it('should reject without the mandatory parameters', async done => {
    for (const field of ['name', 'symbol', 'amount', 'data']) {
      const token = {
        ...nftData,
        amount: 1000,
        dontLogErrors: true
      };
      delete token[field];
      const nftErr = await wallet1.createNft(token)
        .catch(err => err);

      expect(nftErr).toBeInstanceOf(Error);
      expect(nftErr.response.text).toContain(field);
    }
    done();
  });

  it('should reject for insufficient funds', async done => {
    const nftErr = await wallet2.createNft({
      ...nftData,
      amount: 1000,
      dontLogErrors: true
    })
      .catch(err => err);

    expect(nftErr).toBeInstanceOf(Error);
    expect(nftErr.response.text).toContain('HTR funds');
    done();
  });

  it('should reject for a change address outside of the wallet', async done => {
    const nftErr = await wallet1.createNft({
      ...nftData,
      amount: 10,
      change_address: await wallet2.getAddressAt(0),
      dontLogErrors: true
    })
      .catch(err => err);

    expect(nftErr).toBeInstanceOf(Error);
    expect(nftErr.response.text).toContain('Change address');
    done();
  });

  it('should create nft with only mandatory parameters', async done => {
    const htrBalanceBefore = await wallet1.getBalance();
    const nextAddress = await wallet1.getNextAddress();

    const nftTx = await wallet1.createNft({
      ...nftData,
      amount: 1
    });
    expect(nftTx.hash).toBeDefined();
    // No authority tokens
    for (const output of nftTx.outputs) {
      expect(
        output.token_data === TOKEN_DATA.HTR
        || output.token_data === TOKEN_DATA.TOKEN
      ).toBe(true);
    }

    await TestUtils.pauseForWsUpdate();

    // The fees (1) and deposits (1) should be deducted
    const htrBalanceAfter = await wallet1.getBalance();
    expect(htrBalanceAfter.available).toBe(htrBalanceBefore.available - 2);

    // NFT should be on the next available address
    const addrInfo = await TestUtils.getAddressInfo(nextAddress, wallet1.walletId, nftTx.hash);
    expect(addrInfo.total_amount_available).toBe(1);

    done();
  });

  it('should create nft with address and change address', async done => {
    const destAddr = await wallet1.getNextAddress(true);
    const changeAddr = await wallet1.getNextAddress(true);

    const nftTx = await wallet1.createNft({
      ...nftData,
      amount: 1,
      address: destAddr,
      change_address: changeAddr
    });
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

    await TestUtils.pauseForWsUpdate();

    // Validating balances for target addresses
    const destInfo = await TestUtils.getAddressInfo(destAddr, wallet1.walletId, nftTx.hash);
    expect(destInfo.total_amount_available).toBe(1);
    const changeInfo = await TestUtils.getAddressInfo(changeAddr, wallet1.walletId);
    expect(changeInfo.total_amount_available).toBe(changeAmount);

    done();
  });

  it('should create nft with mint authority', async done => {
    const nftTx = await wallet1.createNft({
      ...nftData,
      amount: 1,
      create_mint: true
    });

    expect(nftTx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = nftTx.outputs.filter(o => o.token_data === TOKEN_DATA.AUTHORITY_TOKEN);
    expect(authorityOutputs.length).toBe(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);

    done();
  });

  it('should create nft with melt authority', async done => {
    const nftTx = await wallet1.createNft({
      ...nftData,
      amount: 1,
      create_melt: true
    });

    expect(nftTx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = nftTx.outputs.filter(o => o.token_data === TOKEN_DATA.AUTHORITY_TOKEN);
    expect(authorityOutputs.length).toBe(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);

    done();
  });

  it('should create nft with mint and melt authorities', async done => {
    const nftTx = await wallet1.createNft({
      ...nftData,
      amount: 1,
      create_melt: true,
      create_mint: true
    });

    expect(nftTx.hash).toBeDefined();

    // Validating authority tokens
    const authorityOutputs = nftTx.outputs.filter(o => o.token_data === TOKEN_DATA.AUTHORITY_TOKEN);
    expect(authorityOutputs.length).toBe(2);
    expect(authorityOutputs.find(o => o.value === AUTHORITY_VALUE.MINT)).toBeTruthy();
    expect(authorityOutputs.find(o => o.value === AUTHORITY_VALUE.MELT)).toBeTruthy();

    done();
  });
});
