import { Transaction, Input, Output, helpersUtils, SendTransaction } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const walletId = 'stub_push_tx';

function createTxToPush(inputs, outputs) {
  const tx = new Transaction(inputs, outputs);
  for (const input of tx.inputs) {
    // Fake input data to mock signatures
    input.setData(Buffer.from('F415ED474', 'hex'));
  }
  return tx;
}

describe('push tx api', () => {
  const FAKE_TX_ID = '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca';
  const FAKE_TX_HEX = '0099aaffAAFF';

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should not accept an invalid txHex', async () => {
    const response = await TestUtils.request
      .post('/push-tx')
      .send({
        txHex: 'invalid-tx-hex',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should return error from wallet-lib method errors', async () => {
    const createSpy = jest.spyOn(helpersUtils, 'createTxFromHex').mockImplementationOnce(() => {
      throw new Error('Boom!');
    });
    let response = await TestUtils.request
      .post('/push-tx')
      .send({ txHex: FAKE_TX_HEX })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Boom!',
    });

    createSpy.mockImplementation(() => createTxToPush([new Input(FAKE_TX_ID, 0)], [new Output(1, Buffer.from('CAFECAFE', 'hex'))]));
    const miningSpy = jest.spyOn(SendTransaction.prototype, 'runFromMining').mockImplementationOnce(async () => {
      throw new Error('Another boom!');
    });
    response = await TestUtils.request
      .post('/push-tx')
      .send({ txHex: FAKE_TX_HEX })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Another boom!',
    });

    // Cleanup
    miningSpy.mockRestore();
    createSpy.mockRestore();
  });

  it('should push valid transactions', async () => {
    const tx = createTxToPush([new Input(FAKE_TX_ID, 0)], [new Output(1, Buffer.from('CAFECAFE', 'hex'))]);
    const response = await TestUtils.request
      .post('/push-tx')
      .send({ txHex: tx.toHex() })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      tx: expect.objectContaining({
        hash: expect.any(String),
      }),
    });
  });
});
