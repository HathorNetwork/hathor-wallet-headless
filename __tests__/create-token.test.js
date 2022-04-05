import TestUtils from './test-utils';

describe('create-token api', () => {
  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
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
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
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
        .set({ 'x-wallet-id': TestUtils.walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBeFalsy();
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
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should receive an error when trying to do concurrent create-token (lock/unlock behavior)', async () => {
    const promise1 = TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    const promise2 = TestUtils.request
      .post('/wallet/create-token')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
      })
      .set({ 'x-wallet-id': TestUtils.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);
    expect(response1.status).toBe(200);
    expect(response1.body.hash).toBeTruthy();
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();
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
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });
});
