import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';
import { TOKEN_DATA, AUTHORITY_VALUE } from '../integration/configuration/test-constants';

const walletId = 'stub_p2sh_create_tx_proposal';

describe('create-token tx-proposal api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    await TestUtils.startWallet({ walletId, multisig: true });
  });

  afterAll(async () => {
    global.config.multisig = {};
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG']));
  });

  it('should not accept create token with empty name', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: '',
        symbol: 'MCT',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept create token with empty symbol', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: '',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept create token with amount 0', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 0,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept create token without funds to cover it', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1_000_000_000_000, // 1 trillion
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body selecting address', async () => {
    const address = TestUtils.multisigAddresses[2];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        address,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', address]));
  });

  it('should not accept create token with empty address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        address: '',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body selecting change address', async () => {
    const changeAddress = TestUtils.multisigAddresses[3];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        change_address: changeAddress,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', changeAddress]));
  });

  it('should not accept create token with empty change address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        change_address: '',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept create token with a change address that does not belong to the wallet', async () => {
    const changeAddress = TestUtils.addresses[0];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        change_address: changeAddress,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body without mint or melt authority', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: false,
        create_melt: false,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG']));
    expect(tx.outputs).toHaveLength(2);
  });

  it('should return 200 with a valid body with a mint authority only', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: true,
        create_melt: false,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG']));
    expect(tx.outputs).toHaveLength(3);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);
  });

  it('should return 200 with a valid body with a mint authority selecting an authority address', async () => {
    const mintAuthorityAddress = TestUtils.multisigAddresses[2];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: true,
        mint_authority_address: mintAuthorityAddress,
        create_melt: false,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', mintAuthorityAddress]));
    expect(tx.outputs).toHaveLength(3);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);
  });

  it('should not accept create token with empty mint authority address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: true,
        mint_authority_address: '',
        create_melt: false,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body with a mint authority selecting an external authority address', async () => {
    const mintAuthorityAddress = TestUtils.addresses[1];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: true,
        mint_authority_address: mintAuthorityAddress,
        allow_external_mint_authority_address: true,
        create_melt: false,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', mintAuthorityAddress]));
    expect(tx.outputs).toHaveLength(3);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);
  });

  it('should return 200 with a valid body with a melt authority only', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: false,
        create_melt: true,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG']));
    expect(tx.outputs).toHaveLength(3);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);
  });

  it('should return 200 with a valid body with a melt authority selecting an authority address', async () => {
    const meltAuthorityAddress = TestUtils.multisigAddresses[2];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: false,
        create_melt: true,
        melt_authority_address: meltAuthorityAddress,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', meltAuthorityAddress]));
    expect(tx.outputs).toHaveLength(3);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);
  });

  it('should not accept create token with empty melt authority address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: false,
        create_melt: true,
        melt_authority_address: '',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body with a melt authority selecting an external authority address', async () => {
    const meltAuthorityAddress = TestUtils.addresses[1];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: false,
        create_melt: true,
        melt_authority_address: meltAuthorityAddress,
        allow_external_melt_authority_address: true,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', meltAuthorityAddress]));
    expect(tx.outputs).toHaveLength(3);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(1);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);
  });

  it('should return 200 with a valid body with a mint and melt authority selecting an authority address', async () => {
    const mintAuthorityAddress = TestUtils.multisigAddresses[2];
    const meltAuthorityAddress = TestUtils.multisigAddresses[3];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: true,
        mint_authority_address: mintAuthorityAddress,
        create_melt: true,
        melt_authority_address: meltAuthorityAddress,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', mintAuthorityAddress, meltAuthorityAddress]));
    expect(tx.outputs).toHaveLength(4);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(2);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);
    expect(authorityOutputs[1].value).toBe(AUTHORITY_VALUE.MELT);
  });

  it('should return 200 with a valid body with a mint and melt authority selecting an external authority address', async () => {
    const mintAuthorityAddress = TestUtils.addresses[2];
    const meltAuthorityAddress = TestUtils.addresses[3];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 1,
        create_mint: true,
        mint_authority_address: mintAuthorityAddress,
        allow_external_mint_authority_address: true,
        create_melt: true,
        melt_authority_address: meltAuthorityAddress,
        allow_external_melt_authority_address: true,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', mintAuthorityAddress, meltAuthorityAddress]));
    expect(tx.outputs).toHaveLength(4);
    const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
    expect(authorityOutputs).toHaveLength(2);
    expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MINT);
    expect(authorityOutputs[1].value).toBe(AUTHORITY_VALUE.MELT);
  });
});
