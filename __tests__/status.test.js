import TestUtils from './test-utils';

describe('status api', () => {
  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/status')
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.statusMessage).toBe('Ready');
  });
});
