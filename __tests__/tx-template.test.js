import { HathorWallet, SendTransaction } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const walletId = 'stub_simple_send_tx';

describe('tx-template build api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should receive an error when trying to do concurrent builds (lock/unlock behavior)', async () => {
    const spy = jest.spyOn(HathorWallet.prototype, 'buildTxTemplate').mockImplementation(async () => {
      return await new Promise(resolve => {
        setTimeout(() => resolve({
          toHex: () => ('tx-hex'),
        }), 1000);
      });
    });
    try {
      const promise1 = TestUtils.request
        .post('/wallet/tx-template/build')
        .send([
          { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
          { type: 'input/utxo', fill: 1 },
          { type: 'output/token', amount: 1, address: '{addr}' },
        ])
        .set({ 'x-wallet-id': walletId });
      const promise2 = TestUtils.request
        .post('/wallet/tx-template/build')
        .send([
          { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
          { type: 'input/utxo', fill: 1 },
          { type: 'output/token', amount: 1, address: '{addr}' },
        ])
        .set({ 'x-wallet-id': walletId });

      const [response1, response2] = await Promise.all([promise1, promise2]);
      console.debug(response1)
      expect(response1.status).toBe(200);
      expect(response1.body.txHex).toEqual('tx-hex');
      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});


describe('tx-template run api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should receive an error when trying to do concurrent builds (lock/unlock behavior)', async () => {
    const spy = jest.spyOn(SendTransaction.prototype, 'updateOutputSelected').mockImplementation(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    });
    try {
      const promise1 = TestUtils.request
        .post('/wallet/tx-template/run')
        .send([
          { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
          { type: 'input/utxo', fill: 1 },
          { type: 'output/token', amount: 1, address: '{addr}' },
        ])
        .set({ 'x-wallet-id': walletId });
      const promise2 = TestUtils.request
        .post('/wallet/tx-template/run')
        .send([
          { type: 'action/setvar', name: 'addr', call: { method: 'get_wallet_address' } },
          { type: 'input/utxo', fill: 1 },
          { type: 'output/token', amount: 1, address: '{addr}' },
        ])
        .set({ 'x-wallet-id': walletId });

      const [response1, response2] = await Promise.all([promise1, promise2]);
      expect(response1.status).toBe(200);
      expect(response1.body.hash).toBeTruthy();
      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
