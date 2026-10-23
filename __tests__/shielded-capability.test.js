import TestUtils from './test-utils';

const walletId = 'stub_shielded_readonly';
// Read-only wallets are started from an account xpub and have no shielded keys
const XPUBKEY = 'xpub6C95ufyyhEr2ntyGGfeHjyvxffmNZQ7WugyChhu1Fzor1tMUc4K2MUdwkcJoTzjVkg46hurWWU9gvZoivLiDk6MdsKukz3JiX5Fib2BDa2T';

describe('shielded capability of a read-only wallet', () => {
  beforeAll(async () => {
    const response = await TestUtils.request
      .post('/start')
      .send({ xpubkey: XPUBKEY, 'wallet-id': walletId });
    expect(response.body.success).toBe(true);
    await TestUtils.waitReady({ walletId, retries: 10 });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should report level none on /wallet/status', async () => {
    const response = await TestUtils.request
      .get('/wallet/status')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.shielded).toMatchObject({
      level: 'none',
      reason: 'no-shielded-keys',
      canReceive: false,
      canSpend: false,
    });
  });

  it('should refuse a shielded address with the lib error code', async () => {
    for (const query of [{ legacy: false }, { legacy: false, index: 0 }]) {
      const response = await TestUtils.request
        .get('/wallet/address')
        .query(query)
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: expect.any(String),
        errorCode: 'shielded-no-keys',
      });
      expect(response.body).not.toHaveProperty('stack');
    }
  });

  it('should refuse the shielded address list like a single shielded address', async () => {
    const response = await TestUtils.request
      .get('/wallet/addresses')
      .query({ legacy: false })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, errorCode: 'shielded-no-keys' });
  });

  it('should keep serving legacy addresses', async () => {
    const response = await TestUtils.request
      .get('/wallet/address')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toEqual(expect.any(String));
  });
});
