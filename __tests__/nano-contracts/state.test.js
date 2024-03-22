import TestUtils from '../test-utils';

const walletId = 'stub_state';

describe('state api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595', 'fields[]': ['total'] })
      .set({ 'x-wallet-id': walletId });
    // Will return the fixture data from the http request
    expect(response.status).toBe(200);
    expect(response.body.state.nc_id).toBe('3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595');
    expect(response.body.state.blueprint_name).toBe('Bet');
    expect(response.body.state.fields.total.value).toBe(300);
  });

  it('should fail without required parameter', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });
});
