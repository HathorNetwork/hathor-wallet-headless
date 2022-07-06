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

  it('should unlock utxos from a partial-tx', async () => {
    const history = {
      hash1: {
        tx_id: 'hash1',
        outputs: [
          { selected_as_input: true },
          { foo: true },
          { selected_as_input: true },
        ]
      },
      hash2: {
        tx_id: 'hash2',
        outputs: [
          { foo: true },
          { foo: true },
          { foo: true },
        ]
      },
    };
    const spyHistory = jest.spyOn(hathorLib.HathorWallet.prototype, 'getFullHistory')
      .mockImplementation(() => history);
    const spyGetData = jest.spyOn(hathorLib.wallet, 'getWalletData')
      .mockImplementationOnce(() => ({}));
    const spySetData = jest.spyOn(hathorLib.wallet, 'setWalletData');
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

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/unlock')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-locked-utxos] response', { body: response.body });
    expect(spySetData).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    history.hash1.outputs[0].selected_as_input = false;
    // history.hash1.outputs[1].selected_as_input = false;
    expect(spySetData.mock.calls[0][0]).toEqual({ historyTransactions: history });

    // cleanup mock
    spyHistory.mockRestore();
    spyGetData.mockRestore();
    spySetData.mockRestore();
    spyDeserialize.mockRestore();
  });
});
