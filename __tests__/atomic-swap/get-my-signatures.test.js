import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_get_my_signatures';

describe('get-my-signatures api', () => {
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
  const spy = jest.spyOn(hathorLib.txApi, 'getTransaction')
    .mockImplementation(async (txId, cb) => (
      new Promise(resolve => {
        process.nextTick(() => {
          resolve({
            success: true,
            tx: {
              tx_id: fakeTxId,
              tokens: [{ uid: fakeUid, symbol: 'FTK', name: 'Fake Token' }],
              outputs: [
                {
                  token_data: 0, // HTR
                  value: 10,
                  decoded: { address: TestUtils.addresses[0] }
                },
                {
                  token_data: 1, // fake token
                  value: 10,
                  decoded: { address: TestUtils.addresses[1] }
                },
              ]
            }
          });
        });
      }).then(data => {
        cb(data);
      })
    ));

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    // cleanup mock
    spy.mockRestore();
  });

  it('should fail if partial_tx is not a string', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should return the signatures for the inputs we own on the transaction', async () => {
    const spyInputs = jest.spyOn(hathorLib.wallet, 'getInputsFromAmount').mockImplementation(() => ({
      inputsAmount: 10,
      inputs: [
        { index: 0, tx_id: fakeTxId }
      ]
    }));
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ value: 10 }],
        receive_tokens: [{ address: TestUtils.addresses[2], value: 10 }],
      })
      .set({ 'x-wallet-id': walletId });

    TestUtils.logger.debug('[atomic-swap:get-my-signatures] should return sigs: create tx-proposal', { body: response.body });

    const { data } = response.body;

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-my-signatures] should return sigs: sign', { body: response.body });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
      isComplete: true,
    });

    TestUtils.logger.debug('[atomic-swap:get-my-signatures] should return sigs: sigs', { signatures: response.body.signatures });

    // cleanup mock
    spyInputs.mockRestore();
  });
});
