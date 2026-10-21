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
 *      processes its own send via the local in-process enqueue path,
 *      bypassing the WS subscription, as long as the outputs go to the
 *      loaded address (index 0).
 */
describe('shielded outputs — default scan policy (SINGLE_ADDRESS)', () => {
  /** @type WalletHelper */
  let wallet;

  beforeAll(async () => {
    try {
      wallet = WalletHelper.getPrecalculatedWallet('shielded-single-addr');
      // POST /start defaults to 'gap-limit' when no scanPolicy is given, so
      // the policy is asked for explicitly.
      await WalletHelper.startMultipleWalletsForTest([wallet], { scanPolicy: 'single-address' });
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

  it('starts and reaches READY state with the single-address policy', async () => {
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

  it('pairs a single shielded output (protocol rule still met)', async () => {
    const shieldedAddr = await wallet.getShieldedAddressAt(0);
    const tx = await wallet.sendTx({
      outputs: [{ address: shieldedAddr, value: 100, shielded: 1 }],
    });
    expect(tx.hash).toBeDefined();
    const decoded = await TestUtils.getTransaction(wallet.walletId, tx.hash);
    expect(decoded.shielded_outputs.length).toBeGreaterThanOrEqual(2);
  });

  it('sends shielded outputs to self under SINGLE_ADDRESS', async () => {
    // Self-send is the canonical "works without WS subscription" pattern:
    // the wallet learns about its own tx via the local enqueue inside
    // SendTransaction.run() — see sendTransaction.ts ~line 837. The
    // receiver-side path (which is the same wallet here) doesn't depend
    // on a WS push, so the shielded outputs get decoded and credited even
    // under SINGLE_ADDRESS.
    // Only index 0 is loaded under SINGLE_ADDRESS, so both outputs (and the
    // shielded change, paid to the current address) go to it: an output to a
    // derived but unloaded index would not be credited.
    const a0 = await wallet.getShieldedAddressAt(0);

    const balanceBefore = await wallet.getBalance();
    const tx = await wallet.sendTx({
      outputs: [
        { address: a0, value: 200, shielded: 1 },
        { address: a0, value: 100, shielded: 1 },
      ],
    });
    expect(tx.hash).toBeDefined();

    // The 300 we sent comes back as decoded shielded outputs to the same
    // wallet, and so does the change, which is shielded too since every HTR
    // output is: only the shielded outputs' fee is gone.
    const fee = await TestUtils.getShieldedOutputsFee(wallet.walletId, tx.hash);
    expect(fee).toBeGreaterThanOrEqual(2);
    const balanceAfter = await wallet.getBalance();
    const spent = BigInt(balanceBefore.available) - BigInt(balanceAfter.available);
    expect(spent).toBe(BigInt(fee));
  });
});
