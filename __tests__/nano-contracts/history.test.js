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
    expect(response.body.history.length).toBe(2);
    expect(response.body.history[0].hash).toBe('0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50');
    expect(response.body.history[1].hash).toBe('000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16');
  });

  it('should fail without required parameter', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });
});
