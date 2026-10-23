import TestUtils from './test-utils';
import { initializedWallets } from '../src/services/wallets.service';

const walletId = 'stub_address_info';

describe('address-info api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.index).toBe(0);
    expect(response.body.legacy).toBe(true);
  });

  it('should say a shielded address is not on the legacy chain', async () => {
    const shielded = await TestUtils.request
      .get('/wallet/address')
      .query({ index: 0, legacy: false })
      .set({ 'x-wallet-id': walletId });

    // And the spend-derived P2PKH address its shielded outputs are paid to
    const { ctMappingAddress: spendAddress } = await initializedWallets.get(walletId).storage
      .getAddressInfo(shielded.body.address);

    for (const address of [shielded.body.address, spendAddress]) {
      for (const path of ['/wallet/address-info', '/wallet/address-index']) {
        // eslint-disable-next-line no-await-in-loop
        const response = await TestUtils.request
          .get(path)
          .query({ address })
          .set({ 'x-wallet-id': walletId });
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ success: true, index: 0, legacy: false });
      }
    }

    const legacy = await TestUtils.request
      .get('/wallet/address-index')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN' })
      .set({ 'x-wallet-id': walletId });
    expect(legacy.body).toEqual({ success: true, index: 0, legacy: true });
  });

  it('should return address-info for a custom token', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN', token: '01' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.index).toBe(0);
  });

  it('should not return address-info for an invalid address', async () => {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({ address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQq3' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });
});
