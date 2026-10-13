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

  it('split=true buckets locked value correctly and reconciles with the totals', async () => {
    // HTR: the locked value MUST land in a bucket's `locked`. This is the core
    // SHLD-1 regression — the old walk read a non-existent `utxo.locked` field,
    // so per-bucket `locked` was always 0 and locked value leaked into
    // `available`. (The HTR fixture has a known phantom-UTXO quirk that makes the
    // aggregate `available` differ from the raw UTXO sum, so we don't assert
    // available reconciliation here — the locked bucketing is the bug under test.)
    const htr = await TestUtils.request
      .get('/wallet/balance')
      .query({ split: true })
      .set({ 'x-wallet-id': walletId });
    expect(htr.status).toBe(200);
    expect(Number(htr.body.transparent.locked)).toBe(6400);
    expect(Number(htr.body.shielded.locked)).toBe(0);
    expect(Number(htr.body.transparent.locked) + Number(htr.body.shielded.locked))
      .toBe(htr.body.locked);

    // Custom token (clean fixture): buckets fully reconcile with the totals, and
    // authority UTXOs are excluded (their `value` is the authority bitmask, which
    // the old walk wrongly summed into `available`).
    const t09 = await TestUtils.request
      .get('/wallet/balance')
      .query({ split: true, token: '09' })
      .set({ 'x-wallet-id': walletId });
    expect(t09.status).toBe(200);
    expect(Number(t09.body.transparent.available) + Number(t09.body.shielded.available))
      .toBe(t09.body.available);
    expect(Number(t09.body.transparent.locked) + Number(t09.body.shielded.locked))
      .toBe(t09.body.locked);
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
