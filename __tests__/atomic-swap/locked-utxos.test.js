import hathorLib from '@hathor/wallet-lib';
import { ProposalInput, PartialTx } from '@hathor/wallet-lib/lib/models/partial_tx';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_tx_proposal_sign';

describe('locked utxos api', () => {
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

  it('should not allow invalid partial_tx', async () => {
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/unlock')
      .send({ partial_tx: 123 })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:invalid-locked-params] response', { body: response.body });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/unlock')
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:invalid-locked-params] response', { body: response.body });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should unlock utxos from a partial-tx', async () => {
    const spyDeserialize = jest.spyOn(PartialTx, 'deserialize')
      .mockImplementation(() => {
        const partialTx = new PartialTx(new hathorLib.Network('testnet'));
        partialTx.inputs = [
          new ProposalInput('hash1', 0, 1, 0),
          new ProposalInput('hash1', 1, 1, 0),
          new ProposalInput('hash3', 1, 1, 0),
        ];
        return partialTx;
      });
    const spyMark = jest.spyOn(hathorLib.HathorWallet.prototype, 'markUtxoSelected').mockImplementation(() => {});

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/unlock')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-locked-utxos] response', { body: response.body });

    expect(spyMark).toHaveBeenCalledTimes(3);
    expect(spyMark).toHaveBeenNthCalledWith(1, 'hash1', 0, false);
    expect(spyMark).toHaveBeenNthCalledWith(2, 'hash1', 1, false);
    expect(spyMark).toHaveBeenNthCalledWith(3, 'hash3', 1, false);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    // cleanup mock
    spyMark.mockRestore();
    spyDeserialize.mockRestore();
  });
});
