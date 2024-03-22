import TestUtils from '../test-utils';

const walletId = 'stub_history';

describe('history api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595' })
      .set({ 'x-wallet-id': walletId });
    // Will return the fixture data from the http request
    expect(response.status).toBe(200);
    expect(response.body.history.length).toBe(1);
    expect(response.body.history[0].hash).toBe('5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a');
  });

  it('should fail without required parameter', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });
});
