import hathorLib, { config, swapService } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';
import atomicSwapServiceMethods from '../../src/services/atomic-swap.service';

const walletId = 'stub_atomic_swap_create_tx_proposal';
describe('fetchFromService', () => {
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
  const spyApi = jest.spyOn(hathorLib.txApi, 'getTransaction');
  const spyUtxos = jest.spyOn(hathorLib.Storage.prototype, 'selectUtxos');
  async function* mockUtxos(options) {
    yield {
      txId: fakeTxId,
      index: 0,
      token: hathorLib.constants.NATIVE_TOKEN_UID,
      address: TestUtils.addresses[0],
      value: 10,
      authorities: 0,
      timelock: null,
      type: 1,
      height: null,
    };
  }

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
    spyApi.mockImplementation(async (txId, cb) => {
      cb({
        success: true,
        tx: {
          tokens: [{ uid: fakeUid }],
          outputs: [
            {
              value: 10,
              token: hathorLib.constants.NATIVE_TOKEN_UID,
              token_data: 0,
              decoded: { address: TestUtils.addresses[0] },
            },
            {
              value: 10,
              token: fakeUid,
              token_data: 1,
              decoded: { address: TestUtils.addresses[1] },
            },
          ]
        },
      });
    });
    spyUtxos.mockImplementation(mockUtxos);
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    spyApi.mockRestore();
    spyUtxos.mockRestore();
  });

  config.setSwapServiceBaseUrl('http://fake-swap-service');

  it('should not interact with the service if the feature flag is disabled', async () => {
    // De-activating the global feature flag.
    global.constants.SWAP_SERVICE_FEATURE_TOGGLE = false;

    const response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/fetch/1a574e6c-7329-4adc-b98c-b70fb20ef919')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(405);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Method not allowed',
    });
  });

  it('should raise an error for requesting a non-registered proposal', async () => {
    // Activating the global feature flag. All tests from now on will have it available.
    global.constants.SWAP_SERVICE_FEATURE_TOGGLE = true;

    const response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/fetch/1a574e6c-7329-4adc-b98c-b70fb20ef919')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Proposal is not registered. Register it first through [POST] /register/:proposalId',
    });
  });

  it('should rethrow an error from the service', async () => {
    // Configuring the local storage for the following tests
    await atomicSwapServiceMethods.addListenedProposal(
      walletId,
      '1a574e6c-7329-4adc-b98c-b70fb20ef919',
      'abc123',
    );
    const mockLib = jest.spyOn(swapService, 'get')
      .mockImplementationOnce(async () => {
        throw new Error('Swap Service Failure!');
      });

    const response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/fetch/1a574e6c-7329-4adc-b98c-b70fb20ef919')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Swap Service Failure!',
    });

    mockLib.mockRestore();

    // Asserting the proposal is still on local storage
    const lp = await atomicSwapServiceMethods.getListenedProposals(walletId);
    expect(lp.has('1a574e6c-7329-4adc-b98c-b70fb20ef919')).toBe(true);
  });

  it('should return all properties from the service on success', async () => {
    const expectedResult = {
      proposalId: '1a574e6c-7329-4adc-b98c-b70fb20ef919',
      version: 0,
      timestamp: 'Fri Mar 10 2023 23:13:48 GMT-0300 (Brasilia Standard Time)',
      partialTx: 'PartialTx|0001000102003ca9953dd2bc3ea3f9269d5d5b6de8cc10cc3bc29ba67906cb61def25ddb54000000000000c600001976a914366ed901c7c3710d9077258906403aaaf40b3de188ac0000271000001976a914366ed901c7c3710d9077258906403aaaf40b3de188ac0000000000000000640bb9ab0000000000|WigJu6HhyGg4qbH3xUmhJBt89XxaTcyeas,00,0,c7|0',
      signatures: null,
      history: []
    };
    const mockLib = jest.spyOn(swapService, 'get')
      .mockImplementationOnce(async () => expectedResult);

    const response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/fetch/1a574e6c-7329-4adc-b98c-b70fb20ef919')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      proposal: expectedResult,
    });

    mockLib.mockRestore();
  });

  it('should remove the proposal from local storage if it is not found on backend', async () => {
    // Configuring the local storage for the following tests
    await atomicSwapServiceMethods.addListenedProposal(
      walletId,
      '1a574e6c-7329-4adc-b98c-b70fb20ef919',
      'abc123',
    );
    const mockLib = jest.spyOn(swapService, 'get')
      .mockImplementationOnce(async () => {
        // Simulating a full axios error with the response status
        const mockError = new Error('Proposal not found');
        mockError.isAxiosError = true;
        mockError.response = { status: 404 };
        throw mockError;
      });

    const response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/fetch/1a574e6c-7329-4adc-b98c-b70fb20ef919')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Proposal not found',
    });

    mockLib.mockRestore();

    // The proposal should have been removed from the listened map
    const lp = await atomicSwapServiceMethods.getListenedProposals(walletId);
    expect(lp.has('1a574e6c-7329-4adc-b98c-b70fb20ef919')).toBe(false);
  });
});
