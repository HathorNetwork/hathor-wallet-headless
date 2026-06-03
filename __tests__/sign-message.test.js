import TestUtils from './test-utils';
import { initializedWallets } from '../src/services/wallets.service';

const walletId = 'stub_sign_message';

describe('sign-message api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should sign a message with a valid address_index', async () => {
    const response = await TestUtils.request
      .post('/wallet/sign-message')
      .send({ message: 'hello', address_index: 0 })
      .set({ 'x-wallet-id': walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.index).toBe(0);
    expect(typeof response.body.signature).toBe('string');
  });

  it('should surface a contextual error when signing throws', async () => {
    // The generic catch block can only be reached by an internally-thrown
    // error (key derivation / signing), which integration tests can't force.
    // Mock the wallet instance the controller uses so signing rejects.
    const wallet = initializedWallets.get(walletId);
    const spy = jest
      .spyOn(wallet, 'signMessageWithAddress')
      .mockRejectedValueOnce(new Error('boom from lib'));

    try {
      const response = await TestUtils.request
        .post('/wallet/sign-message')
        .send({ message: 'hello', address_index: 0 })
        .set({ 'x-wallet-id': walletId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      // The handler prefixes the underlying message so the caller knows which
      // operation failed, and still surfaces the original cause.
      expect(response.body.error).toBe('failed to sign message: boom from lib');
    } finally {
      spy.mockRestore();
    }
  });
});
