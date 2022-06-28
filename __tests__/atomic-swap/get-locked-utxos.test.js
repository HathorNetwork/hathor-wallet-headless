import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_tx_proposal_sign';

describe('get locked utxos api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return a list of utxos', async () => {
    const spy = jest.spyOn(hathorLib.HathorWallet.prototype, 'getFullHistory')
      .mockImplementation(() => ({
        1: {
          tx_id: '1',
          outputs: [
            { selected_as_input: true },
            { foo: true },
            { selected_as_input: true },
          ]
        },
        2: {
          tx_id: '2',
          outputs: [
            { foo: true },
            { foo: true },
            { foo: true },
          ]
        },
        3: {
          tx_id: '3',
          outputs: [
            { foo: true },
            { selected_as_input: true },
          ]
        },
      }));

    const response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/get-locked-utxos')
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-locked-utxos] response', { body: response.body });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      locked_utxos: [{ tx_id: '1', outputs: [0, 2] }, { tx_id: '3', outputs: [1] }],
    });

    // cleanup mock
    spy.mockRestore();
  });
});
