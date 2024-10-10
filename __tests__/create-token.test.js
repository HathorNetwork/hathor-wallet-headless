import { SendTransaction } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const walletId = 'stub_create_token';

describe('create-token api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
  });

  it('should create a token with amount as string', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: '1',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
  });

  it('should not create a token without the required parameters', async () => {
    ['name', 'symbol', 'amount'].forEach(async field => {
      const token = {
        name: 'stub_token',
        symbol: '03',
        amount: 1,
      };
      delete token[field];
      const response = await TestUtils.request
        .post('/wallet/create-token')
        .send(token)
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  it('should not create a token without the required funds to cover it', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 10 ** 9,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should receive an error when trying to do concurrent create-token (lock/unlock behavior)', async () => {
    const spy = jest.spyOn(SendTransaction.prototype, 'updateOutputSelected').mockImplementation(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    });
    try {
      const promise1 = TestUtils.request
        .post('/wallet/create-token')
        .send({
          name: 'stub_token',
          symbol: '03',
          amount: 1,
        })
        .set({ 'x-wallet-id': walletId });
      const promise2 = TestUtils.request
        .post('/wallet/create-token')
        .send({
          name: 'stub_token',
          symbol: '03',
          amount: 1,
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

  // TODO: fix this test case crashing when mocking push_tx with status 400
  it.skip('should not create a token with symbol HTR ', async () => {
    TestUtils.httpMock.onPost('push_tx').replyOnce(400);
    TestUtils.reorderHandlers();
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'Hathor',
        symbol: 'HTR',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });
});
