import hathorLib from '@hathor/wallet-lib';
import { ProposalInput, ProposalOutput, PartialTx } from '@hathor/wallet-lib/lib/models/partial_tx';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_get_my_signatures';

describe('get-my-signatures api', () => {
  const testnet = new hathorLib.Network('testnet');
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const createProposal = (inputs, outputs) => {
    const partialTx = new PartialTx(testnet);
    partialTx.inputs = inputs;
    partialTx.outputs = outputs;

    const proposal = new hathorLib.PartialTxProposal(testnet);
    proposal.partialTx = partialTx;
    return proposal;
  };
  const scriptFromAddress = base58 => {
    const p2pkh = new hathorLib.P2PKH(new hathorLib.Address(base58, { network: testnet }));
    return p2pkh.createScript();
  };

  const spy = jest.spyOn(hathorLib.PartialTxProposal, 'fromPartialTx');
  const spyValidate = jest.spyOn(PartialTx.prototype, 'validate')
    .mockImplementation(async () => true);

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    // cleanup mock
    spy.mockRestore();
    spyValidate.mockRestore();
  });

  afterEach(() => {
    spy.mockClear();
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
    spy.mockImplementation((pt, nt) => createProposal(
      [
        new ProposalInput(fakeTxId, 0, 10, TestUtils.addresses[0]),
      ],
      [
        new ProposalOutput(10, scriptFromAddress(TestUtils.addresses[1])),
      ],
    ));

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-my-signatures] should return sigs: sign', { body: response.body });
    expect(spy).toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
      isComplete: true,
    });
  });
});
