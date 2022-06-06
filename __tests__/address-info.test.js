import TestUtils from './test-utils';

const walletId = 'stub_address_info';

describe('address-info api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.index).toBe(0);
  });

  it('should return address-info for a custom token', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN', token: '01' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.index).toBe(0);
  });

  it('should not return address-info for an invalid address', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQq3' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });
});
