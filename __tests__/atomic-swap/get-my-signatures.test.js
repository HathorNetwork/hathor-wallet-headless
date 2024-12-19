import hathorLib from '@hathor/wallet-lib';
import { ProposalInput, ProposalOutput, PartialTx } from '@hathor/wallet-lib/lib/models/partial_tx';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_get_my_signatures';

describe('get-my-signatures api', () => {
  const testnet = new hathorLib.Network('testnet');
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const createProposal = (storage, inputs, outputs) => {
    const partialTx = new PartialTx(testnet);
    partialTx.inputs = inputs;
    partialTx.outputs = outputs;

    const proposal = new hathorLib.PartialTxProposal(storage);
    proposal.partialTx = partialTx;
    return proposal;
  };
  const scriptFromAddress = base58 => {
    const p2pkh = new hathorLib.P2PKH(new hathorLib.Address(base58, { network: testnet }));
    return p2pkh.createScript();
  };

  const fromPartialTxSpy = jest.spyOn(hathorLib.PartialTxProposal, 'fromPartialTx');
  const spyValidate = jest.spyOn(PartialTx.prototype, 'validate')
    .mockImplementation(async () => true);

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    // cleanup mock
    fromPartialTxSpy.mockRestore();
    spyValidate.mockRestore();
  });

  afterEach(() => {
    fromPartialTxSpy.mockClear();
  });

  it('should fail if partial_tx is invalid', async () => {
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if an Error is thrown', async () => {
    fromPartialTxSpy.mockImplementation((pt, nt) => {
      throw new Error('custom error');
    });

    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: '123' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: false,
      error: 'custom error',
    });

    fromPartialTxSpy.mockClear();
    fromPartialTxSpy.mockImplementation((pt, storage) => createProposal(
      storage,
      [
        new ProposalInput(fakeTxId, 0, 10, TestUtils.addresses[0]),
      ],
      [
        new ProposalOutput(10, scriptFromAddress(TestUtils.addresses[1])),
      ],
    ));
    const spySign = jest.spyOn(hathorLib.PartialTxProposal.prototype, 'signData')
      .mockImplementation(async () => {
        throw new Error('custom error 2');
      });
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: '123' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: false,
      error: 'custom error 2',
    });

    spySign.mockRestore();
  });

  it('should return the signatures for the inputs we own on the transaction', async () => {
    fromPartialTxSpy.mockImplementation((pt, storage) => createProposal(
      storage,
      [
        new ProposalInput(fakeTxId, 0, 10n, TestUtils.addresses[0]),
      ],
      [
        new ProposalOutput(10n, scriptFromAddress(TestUtils.addresses[1])),
      ],
    ));

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-my-signatures] should return sigs: sign', { body: response.body });
    expect(fromPartialTxSpy).toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
  });
});
