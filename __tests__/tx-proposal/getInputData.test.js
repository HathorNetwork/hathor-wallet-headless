import { walletUtils } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_tx_proposal_input_data';
const walletIdMultisig = 'stub_tx_proposal_input_data_p2sh';

describe('Get input-data api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
    await TestUtils.startWallet({
      walletIdMultisig,
      multisig: true,
      preCalculatedAddresses: TestUtils.multisigAddresses,
    });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    await TestUtils.stopWallet({ walletIdMultisig });
    global.config.multisig = {};
  });

  it('should not accept invalid signatures', async () => {
    // P2PKH
    let response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signature: 'invalid-signature', // non-hex signature
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // P2SH
    response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signatures: { [TestUtils.multisigXpub]: 'invalid-signature' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept invalid indexes', async () => {
    // P2PKH
    let response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 'foo',
        signature: 'abc123',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // missing index
    response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        signature: 'abc123',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // P2SH
    response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 'foo',
        signatures: { [TestUtils.multisigXpub]: 'abc123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // missing index
    response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        signatures: { [TestUtils.multisigXpub]: 'abc123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept P2SH inputs from a P2PKH wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signatures: { [TestUtils.multisigXpub]: 'abc0123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
    expect(response.body.error).toEqual('wallet is not MultiSig');
  });

  it('should not accept signatures from unknown signers', async () => {
    // xpubs not on account path will not be recognized
    const unknownXpub = walletUtils.xpubDeriveChild(TestUtils.multisigXpub, 0);
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signatures: { [unknownXpub]: 'abc0123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
    expect(response.body.error).toEqual('signature from unknown signer');
  });

  it('should create p2pkh input data', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signature: 'cafecafe',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      inputData: expect.any(String),
    });
  });

  it('should create p2sh input data', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signatures: {
          [TestUtils.multisigData.stub_seed.pubkeys[2]]: 'cafecafe00',
          [TestUtils.multisigData.stub_seed.pubkeys[3]]: 'cafecafe01',
          [TestUtils.multisigData.stub_seed.pubkeys[1]]: 'cafecafe02',
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      inputData: expect.any(String),
    });
  });
});
