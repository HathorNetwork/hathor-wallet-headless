import { Transaction, Input, Output, helpersUtils, HathorWallet } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_tx_proposal_wallet_inputs';

describe('get wallet inputs api', () => {
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
      .get('/wallet/tx-proposal/get-wallet-inputs')
      .query({
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
    const response = await TestUtils.request
      .get('/wallet/tx-proposal/get-wallet-inputs')
      .query({ txHex: FAKE_TX_HEX })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Boom!',
    });

    // Cleanup
    createSpy.mockRestore();
  });

  it('should get the wallet inputs from lib method', async () => {
    const inputsSpy = jest.spyOn(HathorWallet.prototype, 'getWalletInputInfo').mockImplementationOnce(() => [{
      FOO: 'BAR',
    }]);
    const tx = new Transaction([new Input(FAKE_TX_ID, 0)], [new Output(1, Buffer.from('CAFECAFE', 'hex'))]);

    const response = await TestUtils.request
      .get('/wallet/tx-proposal/get-wallet-inputs')
      .query({ txHex: tx.toHex() })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      inputs: [{ FOO: 'BAR' }],
    });

    inputsSpy.mockRestore();
  });
});
