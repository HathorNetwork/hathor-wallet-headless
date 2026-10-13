import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

/**
 * Route-level validation suite for the shielded surface — these tests don't
 * depend on cross-wallet WS event delivery so they're resilient to any
 * receive-side flakiness in the integration setup. Cross-wallet send/recv
 * scenarios live in shielded-transactions.test.js.
 */
describe('shielded API validation', () => {
  /** @type WalletHelper */
  let wallet;

  beforeAll(async () => {
    wallet = WalletHelper.getPrecalculatedWallet('shielded-validation');
    await WalletHelper.startMultipleWalletsForTest([wallet]);
    // Fund the wallet so the failure mode in each test is unambiguously
    // the validation (and not "no UTXOs to spend").
    await wallet.injectFunds(500, 0);
  });

  afterAll(async () => {
    await wallet.stop();
  });

  it('rejects shielded=3 (above max in [1,2])', async () => {
    const shieldedAddr = await wallet.getShieldedAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: shieldedAddr, value: 100, shielded: 3 },
          { address: shieldedAddr, value: 100, shielded: 3 },
        ],
      })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.body.success).toBe(false);
  });

  it('rejects shielded=0 (below min in [1,2])', async () => {
    const shieldedAddr = await wallet.getShieldedAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: shieldedAddr, value: 100, shielded: 0 },
          { address: shieldedAddr, value: 100, shielded: 0 },
        ],
      })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.body.success).toBe(false);
  });

  it('rejects a single shielded output (protocol Rule 4: min 2 shielded per tx)', async () => {
    const shieldedAddr = await wallet.getShieldedAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: shieldedAddr, value: 100, shielded: 1 }],
      })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.body.success).toBe(false);
  });

  it('rejects shielded output addressed at a legacy transparent address', async () => {
    const legacyAddr = await wallet.getAddressAt(0);
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: legacyAddr, value: 100, shielded: 1 },
          { address: legacyAddr, value: 100, shielded: 1 },
        ],
      })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.body.success).toBe(false);
    // Error message comes from wallet-lib's Address.isShielded() guard.
    expect(response.body.error || '').toMatch(/shielded address/i);
  });

  it('accepts a shielded output to a valid shielded address (sender-side validation only)', async () => {
    // We don't await receiver confirmation here — this test runs against a
    // single wallet to validate that the route accepts a well-formed
    // shielded send and reaches wallet-lib's sendManyOutputsSendTransaction.
    // The shielded send-to-self pattern (no destinationWallet) bypasses the
    // cross-wallet WS wait that the broader send/recv suite depends on.
    const shieldedAddr0 = await wallet.getShieldedAddressAt(0);
    const shieldedAddr1 = await wallet.getShieldedAddressAt(1);

    const tx = await wallet.sendTx({
      outputs: [
        { address: shieldedAddr0, value: 100, shielded: 1 },
        { address: shieldedAddr1, value: 100, shielded: 1 },
      ],
    });
    expect(tx.hash).toBeDefined();
  });
});
