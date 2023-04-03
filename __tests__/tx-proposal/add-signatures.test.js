import { Transaction, Input, Output } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_tx_proposal_add_signatures';
const FAKE_TX_ID = '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca';

describe('add signatures api', () => {
  const FAKE_TX_HEX = '0099aaffAAFF';

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should not accept an invalid txHex', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/add-signatures')
      .send({
        txHex: 'invalid-tx-hex',
        signatures: [{ index: 0, data: 'af' }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not accept invalid signatures', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal/add-signatures')
      .send({
        txHex: FAKE_TX_HEX,
        signatures: [{
          index: 'foo', data: 'deadbeef', // invalid index
        }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/tx-proposal/add-signatures')
      .send({
        txHex: FAKE_TX_HEX,
        signatures: [{
          index: 1, data: 'invalid-signature', // non-hex signature
        }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should add signatures to the transaction', async () => {
    const testTx = new Transaction(
      [
        new Input(FAKE_TX_ID, 0),
        new Input(FAKE_TX_ID, 1),
        new Input(FAKE_TX_ID, 2),
        new Input(FAKE_TX_ID, 3),
      ],
      [
        new Output(4, Buffer.from('CAFED00D', 'hex')),
        new Output(5, Buffer.from('CAFEBABE', 'hex')),
      ],
    );
    const testHex = testTx.toHex();
    testTx.inputs[0].setData(Buffer.from('deadc0de', 'hex'));
    testTx.inputs[1].setData(Buffer.from('0ff1ce', 'hex'));
    testTx.inputs[3].setData(Buffer.from('deadd00d', 'hex'));
    const expectedHex = testTx.toHex();

    const response = await TestUtils.request
      .post('/wallet/tx-proposal/add-signatures')
      .send({
        txHex: testHex,
        signatures: [
          { index: 1, data: '0ff1ce' },
          { index: 3, data: 'deadd00d' },
          { index: 0, data: 'deadc0de' },
        ],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expectedHex,
    });
  });
});
