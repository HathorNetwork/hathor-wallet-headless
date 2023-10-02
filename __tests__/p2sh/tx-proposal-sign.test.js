import TestUtils from '../test-utils';
import settings from '../../src/settings';

const walletId = 'stub_p2sh_tx_proposal_sign';

describe('tx-proposal sign api', () => {
  beforeAll(async () => {
    const config = settings.getConfig();
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    return TestUtils.startWallet({
      walletId,
      preCalculatedAddresses: TestUtils.multisigAddresses,
      multisig: true
    });
  });

  afterAll(async () => {
    const config = settings.getConfig();
    config.multisig = {};
    settings._setConfig(config);
    await TestUtils.stopWallet({ walletId });
  });

  it('should fail if txHex is not a hex string', async () => {
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex: 123, signatures: ['1'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex: '0123g', signatures: ['1'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if txHex is an invalid transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex: '0123456789abcdef', signatures: ['123'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should fail if signatures is an invalid array', async () => {
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex: '0123456789abcdef', signatures: [123] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex: '0123456789abcdef', signatures: [] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return the signatures for the inputs we own on the transaction', async () => {
    const tx = {
      outputs: [
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 6000 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 400 },
      ],
    };
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': walletId });

    const { txHex } = response.body;

    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/get-my-signatures')
      .send({ txHex })
      .set({ 'x-wallet-id': walletId });

    const signature = response.body.signatures;

    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex, signatures: [signature, signature, signature] })
      .set({ 'x-wallet-id': walletId });
    expect(response.body.success).toBe(true);
  });
});
