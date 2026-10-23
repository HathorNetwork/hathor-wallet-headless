import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

/**
 * Route-level validation of the shielded mode of an output. Sends and the
 * wallet-lib checks on them live in shielded-transactions.test.js.
 */
describe('shielded API validation', () => {
  /** @type WalletHelper */
  let wallet;

  beforeAll(async () => {
    wallet = WalletHelper.getPrecalculatedWallet('shielded-validation');
    await WalletHelper.startMultipleWalletsForTest([wallet]);
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
    expect(response.status).toBe(400);
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
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
