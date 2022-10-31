import { Transaction, Input, Output } from '@hathor/wallet-lib';
import { HDPrivateKey } from 'bitcore-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_tx_proposal_input_data';

describe('add signatures api', () => {

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should not accept invalid signatures', async () => {
    const key = new HDPrivateKey();
    const xpub = key.xpubkey;

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
        signatures: { [xpub]: 'invalid-signature' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept invalid indexes', async () => {
    const key = new HDPrivateKey();
    const xpub = key.xpubkey;

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
        signatures: { [xpub]: 'abc123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // missing index
    response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        signatures: { [xpub]: 'abc123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept P2SH inputs from a P2PKH wallet', async () => {
    const key = new HDPrivateKey();
    const xpub = key.xpubkey;

    response = await TestUtils.request
      .post('/wallet/tx-proposal/input-data')
      .send({
        index: 0,
        signatures: { [xpub]: 'abc0123' },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
    expect(response.body.error).toEqual('wallet is not MultiSig');
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
    // start multisig wallet
    try {
      global.config.multisig = TestUtils.multisigData;
      await TestUtils.startWallet({ walletId, multisig: true });

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
    } finally {
      global.config.multisig = {};
      await TestUtils.stopWallet({ walletId });
    }
  });
});
