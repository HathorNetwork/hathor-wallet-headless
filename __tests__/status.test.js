import TestUtils from './test-utils';

const walletId = 'stub_status';

describe('status api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/status')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.statusMessage).toBe('Ready');
  });

  it('should return the shielded capability of a seed wallet', async () => {
    const response = await TestUtils.request
      .get('/wallet/status')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    // A seed wallet with the crypto provider loaded holds both shielded keys,
    // and polls, so it receives and spends shielded outputs
    expect(response.body.shielded).toEqual({
      level: 'full',
      reason: null,
      cause: null,
      canReceive: true,
      canSpend: true,
      historyComplete: true,
      undecoded: { txIds: [], locked: 0, unreadable: 0, error: 0 },
    });
  });
});
