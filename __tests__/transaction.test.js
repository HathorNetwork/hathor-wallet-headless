import TestUtils from './test-utils';

const walletId = 'stub_transaction';

describe('transaction api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.tx_id).toBe(
      '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce'
    );
  });

  it('should not find an invalid transaction', async () => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: '1',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should return 400 for missing parameter id', async () => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });
});
