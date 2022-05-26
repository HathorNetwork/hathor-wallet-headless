import TestUtils from './test-utils';

const walletId = 'stub_get_my_signatures';

describe('get-my-signatures api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    await TestUtils.startWallet({ walletId, multisig: true });
  });

  afterAll(async () => {
    global.config.multisig = {};
    await TestUtils.stopWallet({ walletId });
  });

  it('should fail if txHex is not a hex string', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal/get-my-signatures')
      .send({ txHex: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/tx-proposal/get-my-signatures')
      .send({ txHex: '0123g' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should fail if txHex is an invalid transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/get-my-signatures')
      .send({ txHex: '0123456789abcdef' })
      .set({ 'x-wallet-id': walletId });
    console.log(JSON.stringify(response.body));
    expect(response.status).toBe(200);
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
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.signatures).toBeDefined();
    expect(response.body.signatures.split('|').length).toBe(2);
  });
});
