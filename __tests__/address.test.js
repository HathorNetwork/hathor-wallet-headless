import TestUtils from './test-utils';
import settings from '../src/settings';

const walletId = 'stub_address';

describe('address api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    let response = await TestUtils.request
      .get('/wallet/address')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[4]);

    // Should return the same address for a second call
    response = await TestUtils.request
      .get('/wallet/address')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[4]);
  });

  it('should return 200 with a valid body for index = 0', async () => {
    const response = await TestUtils.request
      .get('/wallet/address')
      .query({ index: 0 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[0]);
  });

  it('should return 200 for a custom index (number or string)', async () => {
    let response = await TestUtils.request
      .get('/wallet/address')
      .query({ index: 2 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[2]);

    response = await TestUtils.request
      .get('/wallet/address')
      .query({ index: '2' })
      .set({ 'x-wallet-id': walletId });
    expect(response.body.address).toBe(TestUtils.addresses[2]);
  });

  it('should return a new address with mark_as_used until the gapLimit is reached', async () => {
    const gapLimit = 20;
    let config = settings.getConfig();
    config.gapLimit = gapLimit;
    settings._setConfig(config);
    const startingIndex = 4; // First unused address
    const upperLimit = gapLimit + startingIndex - 1; // Last address within the gap limit
    for (let index = startingIndex; index <= upperLimit; index++) {
      const response = await TestUtils.request
        .get('/wallet/address')
        .query({ mark_as_used: true })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body.address).toBe(TestUtils.addresses[index]);
    }

    // Subsequent calls should return the last address as the gap limit was reached
    const response = await TestUtils.request
      .get('/wallet/address')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[upperLimit]);

    config = settings.getConfig();
    config.gapLimit = null;
    settings._setConfig(config);
  });
});
