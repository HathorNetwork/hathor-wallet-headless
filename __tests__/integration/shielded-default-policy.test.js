import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

/**
 * Default-scanPolicy (SINGLE_ADDRESS) integration tests for the shielded
 * surface.
 *
 * The rest of the integration suite forces `scanPolicy: 'gap-limit'` so
 * cross-wallet receive tests don't hang — under wallet-lib's default
 * (SCANNING_POLICY.SINGLE_ADDRESS) the wallet only WS-subscribes the
 * current address, so any tx to a higher index is invisible until the
 * cursor rotates to it. That made the original test suite hang at test 2.
 *
 * SINGLE_ADDRESS is still a supported policy though — used by e.g.
 * single-payment-style integrations — so it has to keep working for the
 * scenarios where it's a viable choice. This file covers exactly those:
 *
 *   1. Wallet startup + readiness under the default policy.
 *   2. Shielded address derivation at arbitrary indices (derivation is
 *      lazy and doesn't depend on subscription — verifies that asking for
 *      `getShieldedAddressAt(N)` still works on a single-address wallet).
 *   3. Route-level validation under the default policy (no WS receive
 *      needed — purely sender-side checks).
 *   4. Self-send of shielded outputs under the default policy: the wallet
 *      processes its own send via the local in-process enqueue path
 *      (sendTransaction.ts:837), bypassing the WS subscription entirely,
 *      so it works regardless of which addresses are subscribed.
 */
describe('shielded outputs — default scan policy (SINGLE_ADDRESS)', () => {
  /** @type WalletHelper */
  let wallet;

  beforeAll(async () => {
    try {
      wallet = WalletHelper.getPrecalculatedWallet('shielded-single-addr');
      // `scanPolicy: null` → no scanPolicy field on POST /start → wallet-lib
      // falls back to SCANNING_POLICY.SINGLE_ADDRESS. We test the actual
      // production-default behaviour here, not the test-suite default of
      // 'gap-limit'.
      await WalletHelper.startMultipleWalletsForTest([wallet], { scanPolicy: null });
      // Genesis-funded so validation tests have UTXOs to draw from. Sent to
      // index 0 which is the current/subscribed address — receive works
      // because index 0 IS the loaded slot under SINGLE_ADDRESS.
      await wallet.injectFunds(1000, 0);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet.stop();
  });

  it('starts and reaches READY state without a scanPolicy field', async () => {
    // Sanity check on the wallet lifecycle — confirms the /start handler
    // accepts a body with no scanPolicy and the wallet completes its
    // initial sync. Failure here would mean we accidentally regressed the
    // default-policy startup path while making the test suite work.
    const ready = await TestUtils.isWalletReady(wallet.walletId);
    expect(ready).toBe(true);
  });

  it('derives shielded addresses at arbitrary indices on demand', async () => {
    // Shielded address derivation is lazy: `getAddressAtIndex(N, {legacy:
    // false})` derives and persists at any index regardless of scan
    // policy. It just doesn't *subscribe* the on-chain spend P2PKH under
    // SINGLE_ADDRESS — which is fine for derivation alone.
    const a0 = await wallet.getShieldedAddressAt(0);
    const a3 = await wallet.getShieldedAddressAt(3);
    const a7 = await wallet.getShieldedAddressAt(7);
    expect(a0).toBeTruthy();
    expect(a3).toBeTruthy();
    expect(a7).toBeTruthy();
    expect(a0).not.toBe(a3);
    expect(a3).not.toBe(a7);
    expect(a0.length).toBeGreaterThanOrEqual(50);
  });

  it('rejects shielded outputs to legacy addresses (validation works under default policy)', async () => {
    const legacyAddr = await wallet.getAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: legacyAddr, value: 50, shielded: 1 },
          { address: legacyAddr, value: 50, shielded: 1 },
        ],
      })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.body.success).toBe(false);
    expect(response.body.error || '').toMatch(/shielded address/i);
  });

  it('rejects a single shielded output (protocol Rule 4 still enforced)', async () => {
    const shieldedAddr = await wallet.getShieldedAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: shieldedAddr, value: 100, shielded: 1 }],
      })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.body.success).toBe(false);
  });

  it('sends shielded outputs to self under SINGLE_ADDRESS', async () => {
    // Self-send is the canonical "works without WS subscription" pattern:
    // the wallet learns about its own tx via the local enqueue inside
    // SendTransaction.run() — see sendTransaction.ts ~line 837. The
    // receiver-side path (which is the same wallet here) doesn't depend
    // on a WS push, so the shielded outputs get decoded and credited even
    // under SINGLE_ADDRESS.
    const a0 = await wallet.getShieldedAddressAt(0);
    const a1 = await wallet.getShieldedAddressAt(1);

    const balanceBefore = await wallet.getBalance();
    const tx = await wallet.sendTx({
      outputs: [
        { address: a0, value: 200, shielded: 1 },
        { address: a1, value: 100, shielded: 1 },
      ],
    });
    expect(tx.hash).toBeDefined();

    // The 300 we sent comes back as decoded shielded outputs to the same
    // wallet; only the 2-HTR fee (1 per AmountShielded output) is gone.
    const balanceAfter = await wallet.getBalance();
    const spent = BigInt(balanceBefore.available) - BigInt(balanceAfter.available);
    expect(spent).toBe(2n);
  });
});
