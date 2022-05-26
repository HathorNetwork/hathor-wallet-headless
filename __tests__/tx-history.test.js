import TestUtils from './test-utils';

const walletId = 'stub_tx_history';

describe('tx-history api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/tx-history')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(16);
  });

  it('should return limit (string or number) the transactions returned', async () => {
    let response = await TestUtils.request
      .get('/wallet/tx-history')
      .query({ limit: 3 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    response = await TestUtils.request
      .get('/wallet/tx-history')
      .query({ limit: '3' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });
});
