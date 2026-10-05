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
    expect(response.body.txId).toBeDefined();
    expect(response.body.utxos).toHaveLength(13);
  });
});

describe('utxo-consolidation maximum_amount', () => {
  // A wallet of its own: consolidation spends the stub UTXOs, so sharing the
  // wallet above would change what its "consolidate all" test sees.
  const cappedWalletId = 'stub_utxo_max_amount';

  beforeAll(async () => {
    await TestUtils.startWallet({
      walletId: cappedWalletId,
      preCalculatedAddresses: TestUtils.addresses,
    });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: cappedWalletId });
  });

  it('should respect maximum_amount', async () => {
    // Without the cap all 13 available UTXOs (76809) would be consolidated;
    // 12810 only fits a couple of them.
    const response = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: 'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
        maximum_amount: 12810,
      })
      .set({ 'x-wallet-id': cappedWalletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.total_amount).toBeLessThanOrEqual(12810);
    expect(response.body.total_utxos_consolidated).toBeGreaterThan(0);
    expect(response.body.total_utxos_consolidated).toBeLessThan(13);
  });
});
