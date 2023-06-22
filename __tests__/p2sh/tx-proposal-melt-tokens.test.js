import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';
import { TOKEN_DATA, AUTHORITY_VALUE } from '../integration/configuration/test-constants';

const walletId = 'stub_melt_tokens';

describe('melt-tokens tx-proposal api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    await TestUtils.startWallet(
      {
        walletId,
        multisig: true,
        preCalculatedAddresses: TestUtils.multisigAddresses
      }
    );
  });

  afterAll(async () => {
    global.config.multisig = {};
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils
      .createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG']));
  });

  it('should not accept melt token with empty token', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept melt token with amount 0', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 0,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept melt token without funds to cover it', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1_000_000_000_000, // 1 trillion
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body selecting address', async () => {
    const address = TestUtils.multisigAddresses[2];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 100,
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

  it('should not accept melt token with empty address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
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
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
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

  it('should not accept melt token with empty change address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
        change_address: '',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept melt token with a change address that does not belong to the wallet', async () => {
    const changeAddress = TestUtils.addresses[0];
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
        change_address: changeAddress,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body without melt authority', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
        create_melt: false,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.txHex).toBeDefined();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG']));
    expect(tx.outputs).toHaveLength(1);
  });

  it('should return 200 with a valid body selecting an authority address', async () => {
    const testCases = [
      // amount under 100 do not generate withdraw output
      { amount: 1, expectedOutputLen: 2 },
      // amount equal or greater than 100 generates withdraw output
      { amount: 100, expectedOutputLen: 3 }
    ];
    testCases.forEach(cut => async () => { // cut: case under test
      const mintAuthorityAddress = TestUtils.multisigAddresses[2];
      const response = await TestUtils.request
        .post('/wallet/p2sh/tx-proposal/melt-tokens')
        .send({
          token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
          amount: cut.amount,
          melt_authority_address: mintAuthorityAddress,
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.txHex).toBeDefined();
      const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
      expect(tx.outputs.map(o => o.decodedScript.address.base58))
        .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', mintAuthorityAddress]));
      expect(tx.outputs).toHaveLength(cut.expectedOutputLen);
      const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
      expect(authorityOutputs).toHaveLength(1);
      expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);
    });
  });

  it('should not accept melt token with empty melt authority address', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
        melt_authority_address: '',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a valid body selecting an external authority address', async () => {
    const testCases = [
      // amount under 100 do not generate withdraw output
      { amount: 1, expectedOutputLen: 2 },
      // amount equal or greater than 100 generates withdraw output
      { amount: 100, expectedOutputLen: 3 }
    ];
    testCases.forEach(cut => async () => { // cut: case under test
      const mintAuthorityAddress = TestUtils.addresses[1];
      const response = await TestUtils.request
        .post('/wallet/p2sh/tx-proposal/melt-tokens')
        .send({
          token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
          amount: cut.amount,
          melt_authority_address: mintAuthorityAddress,
          allow_external_melt_authority_address: true,
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.txHex).toBeDefined();
      const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
      expect(tx.outputs.map(o => o.decodedScript.address.base58))
        .toEqual(expect.arrayContaining(['wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG', mintAuthorityAddress]));
      expect(tx.outputs).toHaveLength(cut.expectedOutputLen);
      const authorityOutputs = tx.outputs.filter(o => TOKEN_DATA.isAuthorityToken(o.tokenData));
      expect(authorityOutputs).toHaveLength(1);
      expect(authorityOutputs[0].value).toBe(AUTHORITY_VALUE.MELT);
    });
  });
});
