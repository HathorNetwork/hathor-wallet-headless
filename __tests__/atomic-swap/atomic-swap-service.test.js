import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';
import atomicSwapService from '../../src/services/atomic-swap.service';

const walletId = 'stub_atomic_swap_service';
const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
const spyApi = jest.spyOn(hathorLib.txApi, 'getTransaction');
const spyUtxos = jest.spyOn(hathorLib.HathorWallet.prototype, 'getAvailableUtxos');
function* mockUtxos(options) {
  yield {
    txId: fakeTxId,
    index: 0,
    tokenId: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid,
    value: 10,
    address: TestUtils.addresses[0],
    timelock: null,
    locked: false,
    authorities: 0,
    heightlock: null,
    addressPath: 'm/fake/bip32/path',
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
            token: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid,
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
describe('list proposals', () => {
  it('should return an empty array for no listened proposals', async () => {
    // Should work when there is no map for this wallet
    atomicSwapService.walletListenedProposals.delete(walletId);
    let response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/list')
      .set({ 'x-wallet-id': walletId });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ success: true, proposals: [] });

    // Should work when there is an empty map for this wallet
    atomicSwapService.walletListenedProposals.set(walletId, new Map());
    response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/list')
      .set({ 'x-wallet-id': walletId });

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ success: true, proposals: [] });
  });

  it('should return only the proposal ids', async () => {
    await atomicSwapService.addListenedProposal(walletId, 'prop1', 'pass1');

    let response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/list')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      success: true,
      proposals: ['prop1'],
    });
    await atomicSwapService.addListenedProposal(walletId, 'prop2', 'pass2');

    response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/list')
      .set({ 'x-wallet-id': walletId });
    expect(response.body)
      .toStrictEqual({
        success: true,
        proposals: ['prop1', 'prop2'],
      });
  });
});

describe('remove proposals', () => {
  it('should work when there are no proposals', async () => {
    // Should work when there is no map for this wallet
    atomicSwapService.walletListenedProposals.delete(walletId);

    let response = await TestUtils.request
      .delete('/wallet/atomic-swap/tx-proposal/delete/prop-1')
      .set({ 'x-wallet-id': walletId });
    expect(response.body).toStrictEqual({ success: true });

    // Should work when there is an empty map for this wallet
    atomicSwapService.walletListenedProposals.set(walletId, new Map());
    response = await TestUtils.request
      .delete('/wallet/atomic-swap/tx-proposal/delete/prop-1')
      .set({ 'x-wallet-id': walletId });
    expect(response.body).toStrictEqual({ success: true });
  });

  it('should rethrow errors from the service layer', async () => {
    jest.spyOn(atomicSwapService, 'removeListenedProposal')
      .mockImplementationOnce(() => {
        throw new Error('deletion error');
      });

    const response = await TestUtils.request
      .delete('/wallet/atomic-swap/tx-proposal/delete/prop-1')
      .set({ 'x-wallet-id': walletId });
    expect(response.body).toStrictEqual({
      success: false,
      error: 'deletion error',
    });
  });

  it('should return success for an existing map', async () => {
    // Configuring the wallet before the test
    atomicSwapService.walletListenedProposals.set(walletId, new Map());
    const listenedProposals = atomicSwapService.walletListenedProposals.get(walletId);
    listenedProposals.set('prop-2', {
      id: 'prop-2',
      password: '123'
    });

    // Removing an unexistent proposal
    let response = await TestUtils.request
      .delete('/wallet/atomic-swap/tx-proposal/delete/prop-1')
      .set({ 'x-wallet-id': walletId });
    expect(response.body).toStrictEqual({ success: true });
    expect(listenedProposals.size).toEqual(1);

    // Removing a proposal that is being listened to
    response = await TestUtils.request
      .delete('/wallet/atomic-swap/tx-proposal/delete/prop-2')
      .set({ 'x-wallet-id': walletId });
    expect(response.body).toStrictEqual({ success: true });
    expect(listenedProposals.size).toEqual(0);
  });

  it('should remove the wallet from the proposals map when it is stopped', async () => {
    expect(atomicSwapService.walletListenedProposals.has(walletId)).toEqual(true);

    await TestUtils.request
      .post('/wallet/stop')
      .set({ 'x-wallet-id': walletId });

    expect(atomicSwapService.walletListenedProposals.has(walletId)).toEqual(false);
  });
});
