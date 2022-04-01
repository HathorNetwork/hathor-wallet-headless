import hathorLib from '@hathor/wallet-lib';
import TestUtils from './test-utils';

describe('create tx-proposal api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    // Stop P2PKH wallet started on setupTests
    await TestUtils.stopWallet();
    // Start a MultiSig wallet
    await TestUtils.startWallet({ multisig: true });
  });

  afterAll(() => {
    global.config.multisig = {};
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 },
          { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 1 },
        ],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.txHex).toBeDefined();
    expect(response.body.success).toBeTruthy();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau']));
  });

  it('should return 200 with a valid body selecting inputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        inputs: [{ txId: '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca', index: 1 }],
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.txHex).toBeDefined();
    expect(response.body.success).toBeTruthy();
    const tx = hathorLib.helpersUtils.createTxFromHex(response.body.txHex, new hathorLib.Network('testnet'));
    expect(tx.outputs.map(o => o.decodedScript.address.base58))
      .toEqual(expect.arrayContaining(['WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc']));
    expect(tx.inputs.map(i => i.hash)).toEqual(['0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca']);
    expect(tx.inputs.map(i => i.index)).toEqual([1]);
  });

  it('should accept value as string', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [
          { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 1 },
          { address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN', value: '1' },
        ],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.txHex).toBeDefined();
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept transactions without address or value', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc' }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept transactions with 0 value', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 0 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should accept a custom token transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1, token: '09' }]
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.txHex).toBeTruthy();
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept a custom token transaction without funds to cover it', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{
          address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
          value: 1,
          token: 'unfunded-token'
        }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should accept a transaction with a change_address that does belong to the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
        change_address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept a transaction with a change_address that does not belong to the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
        change_address: 'weHUcEmv91Lfo2CBYVfDLh8Y3sB3pivcQZ',
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });
});
