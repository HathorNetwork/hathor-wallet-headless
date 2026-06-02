import { precalculationHelpers } from '../../scripts/helpers/wallet-precalculation.helper';
import { TestUtils } from './utils/test-utils-integration';
import { initializedWallets } from '../../src/services/wallets.service';

describe('start scanPolicy integration', () => {
  it('should start a wallet with scanPolicy=single-address and only load address 0', async () => {
    // Fresh, never-funded precalculated wallet — no on-chain history means
    // wallet-lib's enableSingleAddressMode check won't downgrade to gap-limit.
    const walletId = 'startScanPolicySingleAddress';
    const { words, addresses } = precalculationHelpers.test.getPrecalculatedWallet();

    const response = await TestUtils.request
      .post('/start')
      .send({
        seed: words,
        'wallet-id': walletId,
        scanPolicy: 'single-address',
      });
    expect(response.status).toEqual(200);
    expect(response.body.success).toBe(true);

    try {
      await TestUtils.poolUntilWalletReady(walletId);

      // First address must be loaded and match the precalculated one.
      const addrResp = await TestUtils.request
        .get('/wallet/address')
        .query({ index: 0 })
        .set({ 'x-wallet-id': walletId });
      expect(addrResp.body.address).toEqual(addresses[0]);

      // Storage must report single-address policy with no carried-over fields.
      const wallet = initializedWallets.get(walletId);
      await expect(wallet.storage.getScanningPolicy()).resolves.toBe('single-address');
      await expect(wallet.storage.getScanningPolicyData()).resolves.toEqual({
        policy: 'single-address',
      });
      // Only address index 0 is ever generated.
      await expect(wallet.storage.store.addressCount()).resolves.toBe(1);
    } finally {
      await TestUtils.stopWallet(walletId);
    }
  });

  it('should ignore gapLimit / policyStartIndex when scanPolicy=single-address', async () => {
    const walletId = 'startScanPolicySingleAddressIgnoresTunables';
    const { words, addresses } = precalculationHelpers.test.getPrecalculatedWallet();

    const response = await TestUtils.request
      .post('/start')
      .send({
        seed: words,
        'wallet-id': walletId,
        scanPolicy: 'single-address',
        // These should be silently dropped — single-address has no tunables.
        gapLimit: 50,
        policyStartIndex: 7,
        policyEndIndex: 12,
      });
    expect(response.status).toEqual(200);
    expect(response.body.success).toBe(true);

    try {
      await TestUtils.poolUntilWalletReady(walletId);

      const addrResp = await TestUtils.request
        .get('/wallet/address')
        .query({ index: 0 })
        .set({ 'x-wallet-id': walletId });
      expect(addrResp.body.address).toEqual(addresses[0]);

      const wallet = initializedWallets.get(walletId);
      await expect(wallet.storage.getScanningPolicy()).resolves.toBe('single-address');
      // Policy data must not contain gapLimit/startIndex/endIndex.
      await expect(wallet.storage.getScanningPolicyData()).resolves.toEqual({
        policy: 'single-address',
      });
      await expect(wallet.storage.store.addressCount()).resolves.toBe(1);
    } finally {
      await TestUtils.stopWallet(walletId);
    }
  });
});
