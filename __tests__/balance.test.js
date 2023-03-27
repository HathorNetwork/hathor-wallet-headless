import TestUtils from './test-utils';

const walletId = 'stub_balance';

describe('balance api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    // XXX
    // The old method to calculate balance used to add all outputs that were
    // unspent (spent_by === null) and unlocked
    // The current method to process balance adds the outputs and removes the balance from any
    // inputs of our wallets
    // But since the fixture has an input of our wallet that is not in any other tx the balance
    // is removed from the sum of the outputs
    // Making the balance be 6400 lower than how we previously calculated it
    // This is not a bug in the code, it is a bug in the test fixture
    expect(response.body.available).toBe(70409);
    expect(response.body.locked).toBe(6400);
  });

  it('should return balance for custom token', async () => {
    const response = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: '09' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(6400);
    expect(response.body.locked).toBe(0);
  });

  it('should return no balance for custom token with invalid type (number)', async () => {
    const response = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: 9 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(0);
    expect(response.body.locked).toBe(0);
  });
});
