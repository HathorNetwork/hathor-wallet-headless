import TestUtils from './test-utils';

const walletId = 'stub_addresses';

describe('addresses api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    global.config.gapLimit = 20;
    const gapLimit = 20;

    const response = await TestUtils.request
      .get('/wallet/addresses')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.addresses.length).toBe(gapLimit + 4);
    expect(response.body.addresses).toEqual(TestUtils.addresses);
    global.config.gapLimit = null;
  });

  it('should return all addresses for a custom gap limit', async () => {
    global.config.gapLimit = 100;

    // restart the wallet to use the new gap limit
    await TestUtils.stopWallet({ walletId });
    await TestUtils.startWallet({ walletId });

    const gapLimit = 100;
    const response = await TestUtils.request
      .get('/wallet/addresses')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.addresses.length).toBe(gapLimit + 4);
    expect(response.body.addresses.slice(0, TestUtils.addresses.length))
      .toEqual(TestUtils.addresses);
    global.config.gapLimit = null;
  });
});
