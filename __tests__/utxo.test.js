import TestUtils from './test-utils';

const walletId = 'stub_utxo';

describe('utxo api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('utxo-filter should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/utxo-filter')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.utxos).toHaveLength(14);
    expect(response.body.total_amount_available).toBe(76809);
    expect(response.body.total_amount_locked).toBe(6400);
  });

  it('utxo-consolidation should consolidate all utxos', async () => {
    const response = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: 'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.total_utxos_consolidated).toBe(13);
    expect(response.body.total_amount).toBe(76809);
    expect(response.body.utxos).toHaveLength(13);
  });
});
