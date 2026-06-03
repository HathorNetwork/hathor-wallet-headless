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

  it('should downgrade to gap-limit when the seed has txs on addresses other than 0', async () => {
    // wallet-lib refuses single-address mode when the wallet already has
    // history outside index 0 (HasTxOutsideFirstAddressError), and the headless
    // controller relies on wallet-lib's own fallback to gap-limit. This test
    // proves that fallback survives the headless wrapper.
    const walletId = 'startScanPolicySingleAddressDowngrade';
    const { words, addresses } = precalculationHelpers.test.getPrecalculatedWallet();

    // 1. Start with the default policy (gap-limit) so address index 1 is loaded
    //    and can receive on-chain funds.
    const gapLimitStart = await TestUtils.request
      .post('/start')
      .send({ seed: words, 'wallet-id': walletId });
    expect(gapLimitStart.body.success).toBe(true);
    await TestUtils.poolUntilWalletReady(walletId);

    try {
      // 2. Put a transaction on address index 1 (not the first address).
      await TestUtils.injectFundsIntoAddress(addresses[1], 100, walletId);
    } finally {
      // 3. Stop the wallet — single-address can only be requested at /start.
      await TestUtils.stopWallet(walletId);
    }

    // 4. Restart the same seed asking for single-address. The on-chain tx on
    //    address 1 must force the downgrade.
    const singleAddressStart = await TestUtils.request
      .post('/start')
      .send({ seed: words, 'wallet-id': walletId, scanPolicy: 'single-address' });
    expect(singleAddressStart.body.success).toBe(true);

    try {
      await TestUtils.poolUntilWalletReady(walletId);

      const wallet = initializedWallets.get(walletId);
      // Policy was silently downgraded to gap-limit, matching the documented
      // behavior in the /start API docs.
      await expect(wallet.storage.getScanningPolicy()).resolves.toBe('gap-limit');
      // And it behaves like a gap-limit wallet: more than one address is loaded.
      await expect(wallet.storage.store.addressCount()).resolves.toBeGreaterThan(1);
    } finally {
      await TestUtils.stopWallet(walletId);
    }
  });

  it('always offers address index 0 as the current address on a single-address wallet', async () => {
    // The current/next address must never advance past index 0: wallet-lib pins
    // currentAddressIndex to 0 (setCurrentAddressIndex is a no-op for index > 0),
    // so even mark_as_used calls keep returning the first address.
    const walletId = 'startScanPolicySingleAddressCurrent';
    const { words, addresses } = precalculationHelpers.test.getPrecalculatedWallet();

    const response = await TestUtils.request
      .post('/start')
      .send({ seed: words, 'wallet-id': walletId, scanPolicy: 'single-address' });
    expect(response.body.success).toBe(true);

    try {
      await TestUtils.poolUntilWalletReady(walletId);

      // Repeated next-address requests (even marking as used) always return 0.
      const first = await TestUtils.getAddressAt(walletId, undefined, true);
      const second = await TestUtils.getAddressAt(walletId, undefined, true);
      expect(first).toEqual(addresses[0]);
      expect(second).toEqual(addresses[0]);

      // Requesting an explicit index > 0 still derives the address (wallet-lib
      // derives on demand from the xpub), but it is never loaded/tracked — the
      // wallet keeps a single loaded address.
      const derived = await TestUtils.getAddressAt(walletId, 5);
      expect(derived).toEqual(addresses[5]);

      const wallet = initializedWallets.get(walletId);
      await expect(wallet.storage.store.addressCount()).resolves.toBe(1);
    } finally {
      await TestUtils.stopWallet(walletId);
    }
  });
});
