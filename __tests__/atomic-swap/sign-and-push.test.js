import hathorLib from '@hathor/wallet-lib';
import { ProposalInput, ProposalOutput, PartialTx } from '@hathor/wallet-lib/lib/models/partial_tx';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_tx_proposal_sign_and_push';

describe('tx-proposal sign-and-push api', () => {
  const testnet = new hathorLib.Network('testnet');
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
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

  it('should fail if params are invalid', async () => {
    // partial_tx is not a string
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: 123, signatures: ['1'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // No partial_tx
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // signatures are empty
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: '123', signatures: [] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // signatures items are not string
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: '123', signatures: ['1', 1] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should fail if signatures is an invalid array', async () => {
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: '1', signatures: [123] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: '0123456789abcdef', signatures: [] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should reject an incomplete transaction', async () => {
    spy.mockImplementation((pt, nt) => createProposal(
      [
        new ProposalInput(fakeTxId, 0, 10, TestUtils.addresses[0]),
      ],
      [
        new ProposalOutput(10, scriptFromAddress(TestUtils.addresses[1])),
        new ProposalOutput(
          10,
          scriptFromAddress(TestUtils.addresses[2]),
          { token: fakeUid, tokenData: 1 },
        ),
      ],
    ));

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:sign] should return sigs: sign+push', { body: response.body });
    expect(spy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: false,
      error: expect.any(String),
    });
  });

  it('should add signatures on the input data', async () => {
    spy.mockImplementation((pt, nt) => createProposal(
      [
        new ProposalInput(fakeTxId, 0, 10, TestUtils.addresses[0]),
      ],
      [
        new ProposalOutput(10, scriptFromAddress(TestUtils.addresses[1])),
      ],
    ));

    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:sign-and-push] should overwrite sigs: get-my-signature', { body: response.body });
    expect(spy).toHaveBeenCalled();

    const realSigs = response.body.signatures;
    const parts = realSigs.split('|');
    parts.splice(-1, 1, '0:cafe');
    const signatures = [parts.join('|')];

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: 'partial-tx-data', signatures })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:sign-and-push] should overwrite sigs: sign', { body: response.body });
    expect(spy).toHaveBeenCalled();
    expect(response.body.success).toBeTruthy();
  });
});
