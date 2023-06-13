import hathorLib, { config, swapService } from '@hathor/wallet-lib';
import { PartialTx, ProposalInput, ProposalOutput } from '@hathor/wallet-lib/lib/models/partial_tx';
import TestUtils from '../test-utils';
import atomicSwapServiceMethods from '../../src/services/atomic-swap.service';

const walletId = 'stub_atomic_swap_tx_proposal_sign';

describe('tx-proposal sign api', () => {
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

  it('should fail if params are invalid', async () => {
    // partial_tx is not a string
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: 123, signatures: ['1'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    // No partial_tx
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    // signatures are empty
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: '123', signatures: [] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    // signatures items are not string
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: '123', signatures: ['1', 1] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if signatures is an invalid array', async () => {
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: '1', signatures: [123] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: '0123456789abcdef', signatures: [] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if an Error is thrown', async () => {
    fromPartialTxSpy.mockImplementation((pt, nt) => {
      throw new Error('custom error');
    });

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: '123' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: false,
      error: 'custom error',
    });
  });

  it('should reject an incomplete transaction', async () => {
    fromPartialTxSpy.mockImplementation((pt, nt) => createProposal(
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
      .post('/wallet/atomic-swap/tx-proposal/sign')
      .send({ partial_tx: 'partial-tx-data' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:sign] should return sigs: sign', { body: response.body });
    expect(fromPartialTxSpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: false,
      error: expect.any(String),
    });
  });

  describe('updating a proposal signatures on the service mediator', () => {
    config.setSwapServiceBaseUrl('http://fake-swap-service');
    let assembleTxSpy;

    beforeAll(async () => {
      assembleTxSpy = jest
        .spyOn(atomicSwapServiceMethods, 'assembleTransaction')
        .mockReturnValue({ signatures: 'mocked-sigs', toHex: () => 'mock-hexed-tx' });
    });

    afterAll(async () => {
      assembleTxSpy.mockRestore();
    });

    it('should not interact with the service if the feature flag is disabled', async () => {
      // De-activating the global feature flag.
      global.constants.SWAP_SERVICE_FEATURE_TOGGLE = false;

      const listenedProposalsSpy = jest.spyOn(atomicSwapServiceMethods, 'getListenedProposals');

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal/sign')
        .send({
          partial_tx: 'partial-tx-data',
          service: { proposal_id: 'mock-id', version: 0 },
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        success: true,
        txHex: 'mock-hexed-tx',
      });
      expect(listenedProposalsSpy).not.toHaveBeenCalled();
    });

    it('should require the proposal to be registered', async () => {
      // Activating the global feature flag.
      global.constants.SWAP_SERVICE_FEATURE_TOGGLE = true;

      // Ensure the proposal does not exist in the listened proposals map
      await atomicSwapServiceMethods.removeListenedProposal(
        walletId,
        'mock-id',
      );

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal/sign')
        .send({
          partial_tx: 'partial-tx-data',
          service: {
            proposal_id: 'mock-id',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(404);
      expect(response.body).toStrictEqual({
        success: false,
        error: 'Proposal is not registered. Register it first.'
      });
    });

    it('should require the mandatory parameters', async () => {
      // Ensure the proposal exists in the listened proposals map
      await atomicSwapServiceMethods.addListenedProposal(
        walletId,
        'mock-id',
        'abc123',
      );

      // Missing version
      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal/sign')
        .send({
          partial_tx: 'partial-tx-data',
          service: {
            proposal_id: 'mock-id',
            // version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        success: false,
        error: 'Missing mandatory parameters: version'
      });
    });

    it('should return no success when service throws', async () => {
      const mockLib = jest.spyOn(swapService, 'update')
        .mockImplementationOnce(async () => { throw new Error('Sigs update Service failure'); });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal/sign')
        .send({
          partial_tx: 'partial-tx-data',
          service: {
            proposal_id: 'mock-id',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        success: false,
        error: 'Sigs update Service failure'
      });

      mockLib.mockRestore();
    });

    it('should return no success when service also had no success', async () => {
      const mockLib = jest.spyOn(swapService, 'update')
        .mockResolvedValue({ success: false });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal/sign')
        .send({
          partial_tx: 'partial-tx-data',
          service: {
            proposal_id: 'mock-id',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        success: false,
        error: 'Unable to update the proposal on the Atomic Swap Service'
      });

      mockLib.mockRestore();
    });

    it('should return success when the service mediator also had success', async () => {
      const mockLib = jest.spyOn(swapService, 'update')
        .mockResolvedValue({ success: true });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal/sign')
        .send({
          partial_tx: 'partial-tx-data',
          service: {
            proposal_id: 'mock-id',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        success: true,
        txHex: 'mock-hexed-tx',
      });

      mockLib.mockRestore();
    });
  });
});
