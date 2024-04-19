import TestUtils from '../test-utils';

const walletId = 'stub_oracle';

describe('oracle apis', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body for oracle data', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-data')
      .query({ oracle: '1234' })
      .set({ 'x-wallet-id': walletId });
    // Will return the fixture data from the http request
    expect(response.status).toBe(200);
    expect(response.body.oracleData).toBe('1234');
  });

  it('should fail without required parameter for oracle data', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-data')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });

  it('should return 200 with a valid body for oracle signed result', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-signed-result')
      .query({ oracle_data: '123456', result: '1x0', type: 'str' })
      .set({ 'x-wallet-id': walletId });
    // Will return the fixture data from the http request
    expect(response.status).toBe(200);
    expect(response.body.signedResult).toBe('123456,1x0,str');
  });

  it('should fail without required parameter for oracle signed result', async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-signed-result')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });
});
