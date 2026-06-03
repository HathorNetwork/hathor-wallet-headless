import { cryptoUtils } from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WALLET_CONSTANTS } from './configuration/test-constants';
import { WalletHelper } from './utils/wallet-helper';

/*
 * Integration coverage for POST /wallet/sign-message.
 *
 * The endpoint accepts either `address_index` or `address` and returns a
 * bitcore.Message-compatible signature plus the resolved {address, index}.
 * Verification on the consumer side uses the wallet-lib's `verifyMessage`
 * primitive — we use it here directly to assert the returned signature is
 * valid for the resolved address.
 */
describe('sign-message route', () => {
  let wallet;

  beforeAll(async () => {
    // Let a startup failure surface — swallowing it leaves `wallet` unset and
    // produces a confusing secondary error in afterAll that masks the real cause.
    wallet = WalletHelper.getPrecalculatedWallet('sign-message-1');
    await WalletHelper.startMultipleWalletsForTest([wallet]);
  });

  afterAll(async () => {
    if (wallet) {
      await wallet.stop();
    }
  });

  it('signs a message using address_index and returns a verifiable signature', async () => {
    const message = 'x402:request:abc123';
    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message, address_index: 0 })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.index).toBe(0);
    expect(typeof response.body.signature).toBe('string');
    expect(response.body.signature.length).toBeGreaterThan(0);

    const expectedAddress = await wallet.getAddressAt(0);
    expect(response.body.address).toBe(expectedAddress);

    // Verify the signature with wallet-lib's verifyMessage. The endpoint is
    // useless if the signature can't be checked off the wire — assert it.
    expect(
      cryptoUtils.verifyMessage(message, response.body.signature, response.body.address)
    ).toBe(true);
  });

  it('signs a message using address and returns a verifiable signature', async () => {
    const message = 'x402:request:xyz789';
    const targetAddress = await wallet.getAddressAt(3);

    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message, address: targetAddress })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.address).toBe(targetAddress);
    expect(response.body.index).toBe(3);
    expect(typeof response.body.signature).toBe('string');

    expect(
      cryptoUtils.verifyMessage(message, response.body.signature, response.body.address)
    ).toBe(true);
  });

  it('prefers address_index when both address and address_index are sent', async () => {
    // Documented contract: when both are passed, `address_index` wins, and the
    // response address is derived from the index actually used to sign (so the
    // returned {address, signature} pair always verifies).
    const message = 'x402:request:both';
    const otherAddress = await wallet.getAddressAt(5);
    const indexAddress = await wallet.getAddressAt(1);

    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message, address_index: 1, address: otherAddress })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.index).toBe(1);
    expect(response.body.address).toBe(indexAddress);

    expect(
      cryptoUtils.verifyMessage(message, response.body.signature, response.body.address)
    ).toBe(true);
  });

  it('rejects when the address is not in the wallet', async () => {
    // A known-valid address from a different seed (the miner wallet), so it is
    // guaranteed not derivable from this wallet — cheaper than spinning up a
    // whole second wallet just to borrow an address.
    const foreignAddress = WALLET_CONSTANTS.miner.addresses[1];

    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message: 'whatever', address: foreignAddress })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/does not belong/i);
  });

  it('rejects when neither address nor address_index is provided', async () => {
    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message: 'no key chosen' })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/required/i);
  });

  it('rejects an empty message', async () => {
    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message: '', address_index: 0 })
      .set({ 'x-wallet-id': wallet.walletId });

    // express-validator rejects with 400 because of isLength({min: 1}).
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects a negative address_index', async () => {
    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message: 'hi', address_index: -1 })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
