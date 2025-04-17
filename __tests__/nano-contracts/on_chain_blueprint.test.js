import { SendTransaction } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_ocb';

describe('create api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/create-on-chain-blueprint')
      .send({
        code: 'test',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBe(true);
  });

  it('should fail without required parameter', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/create-on-chain-blueprint')
      .send({
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);

    const response2 = await TestUtils.request
      .post('/wallet/nano-contracts/create-on-chain-blueprint')
      .send({
        code: 'test',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response2.status).toBe(400);
  });

  it('should receive an error when trying to do concurrent transactions (lock/unlock behavior)', async () => {
    const spy = jest.spyOn(SendTransaction.prototype, 'updateOutputSelected').mockImplementation(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    });
    try {
      const promise1 = TestUtils.request
        .post('/wallet/nano-contracts/create-on-chain-blueprint')
        .send({
          code: 'test',
          address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        })
        .set({ 'x-wallet-id': walletId });
      const promise2 = TestUtils.request
        .post('/wallet/nano-contracts/create-on-chain-blueprint')
        .send({
          code: 'test2',
          address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        })
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
