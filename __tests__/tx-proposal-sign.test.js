import TestUtils from './test-utils';

const walletId = 'stub_tx_proposal_sign';

describe('tx-proposal sign api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    return TestUtils.startWallet({ walletId, multisig: true });
  });

  afterAll(async () => {
    global.config.multisig = {};
    await TestUtils.stopWallet({ walletId });
  });

  it('should fail if txHex is not a hex string', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex: 123, signatures: ['1'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex: '0123g', signatures: ['1'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should fail if txHex is an invalid transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex: '0123456789abcdef', signatures: ['123'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should fail if signatures is an invalid array', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex: '0123456789abcdef', signatures: [123] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex: '0123456789abcdef', signatures: [] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should return the signatures for the inputs we own on the transaction', async () => {
    const tx = {
      outputs: [
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 6000 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 400 },
      ],
    };
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': walletId });

    const { txHex } = response.body;

    response = await TestUtils.request
      .post('/wallet/tx-proposal/get-my-signatures')
      .send({ txHex })
      .set({ 'x-wallet-id': walletId });

    const signature = response.body.signatures;

    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex, signatures: [signature, signature, signature] })
      .set({ 'x-wallet-id': walletId });
    expect(response.body.success).toBeTruthy();
  });
});
