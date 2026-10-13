import TestUtils from './test-utils';

const { initializedWallets } = require('../src/services/wallets.service');

const walletId = 'stub_shielded';

/**
 * Pulls the in-process HathorWallet instance for `walletId` so the tests
 * can patch its shielded-related methods. We don't go through the wallet
 * fixture for these because the fixture data has no shielded keys and
 * never produced a shielded-output decryption — both endpoints exercise
 * specific wallet-lib calls (`storage.getSpendXPubKey`,
 * `storage.getScanXPrivKey`, `wallet.getShieldedUnblindingForTx`) whose
 * behavior is covered in wallet-lib's own test suite, so the headless
 * tests just need to verify the controller wiring and response shape.
 */
function patchedWallet() {
  const w = initializedWallets.get(walletId);
  if (!w) throw new Error(`Test setup error: wallet ${walletId} not started`);
  return w;
}

describe('shielded api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  // Mocks are restored after each test so one test's stubs don't leak
  // into the next. Restoring on the patched-instance level keeps the
  // wallet itself reusable across tests in this file.
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /wallet/shielded/audit-keys', () => {
    it('returns spendXpub + scanXpriv when the wallet has shielded keys', async () => {
      const wallet = patchedWallet();
      const spendXpub = 'xpub6stubSpendKey1234567890ABCDEF';
      const scanXpriv = 'xprv9stubScanKey1234567890ABCDEF';
      jest.spyOn(wallet.storage, 'getSpendXPubKey').mockResolvedValue(spendXpub);
      jest.spyOn(wallet.storage, 'getScanXPrivKey').mockResolvedValue(scanXpriv);

      const res = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set({ 'x-wallet-id': walletId });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, spendXpub, scanXpriv });
      // PIN comes from headless's internal DEFAULT_PIN — the call site
      // must always pass a string (wallet-lib throws on undefined).
      expect(wallet.storage.getScanXPrivKey).toHaveBeenCalledTimes(1);
      expect(typeof wallet.storage.getScanXPrivKey.mock.calls[0][0]).toBe('string');
    });

    it('responds with success=false when the wallet has no shielded keys', async () => {
      // The pre-shielded-feature case: storage.getSpendXPubKey returns
      // null/undefined and the controller short-circuits BEFORE asking
      // for the scan xpriv (avoids surfacing a PIN-decrypt error for a
      // wallet that simply doesn't have these keys to export).
      const wallet = patchedWallet();
      jest.spyOn(wallet.storage, 'getSpendXPubKey').mockResolvedValue(undefined);
      const scanSpy = jest.spyOn(wallet.storage, 'getScanXPrivKey');

      const res = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set({ 'x-wallet-id': walletId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/no shielded keys/i);
      // Critically: scan xpriv was NOT requested. A bug that flipped
      // this check would leak a confusing "PIN decryption failed"
      // message instead of the clean "wallet has no shielded keys" one.
      expect(scanSpy).not.toHaveBeenCalled();
    });

    it('wraps wallet-lib errors as success=false instead of HTTP 500', async () => {
      // A failure pulling either key should surface as a structured
      // error response, not a stack trace bubbling up to Express's
      // default error handler.
      const wallet = patchedWallet();
      jest.spyOn(wallet.storage, 'getSpendXPubKey').mockRejectedValue(new Error('storage broke'));

      const res = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set({ 'x-wallet-id': walletId });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, error: 'storage broke' });
    });
  });

  describe('GET /wallet/shielded/unblinding', () => {
    // Same 64-char hex (32 bytes) shape the route validator requires.
    const txId = 'a'.repeat(64);

    it('returns the encoded payload and the ready-to-append fragment for a tx with openings', async () => {
      const wallet = patchedWallet();
      // Patch the wallet-lib API used by the controller.
      wallet.getShieldedUnblindingForTx = jest.fn().mockResolvedValue({
        outputs: [
          {
            index: 1,
            value: 100n,
            token: '00'.repeat(32),
            vbf: '11'.repeat(32),
          },
        ],
        inputs: [],
      });

      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${txId}`)
        .set({ 'x-wallet-id': walletId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.txId).toBe(txId);
      expect(typeof res.body.payload).toBe('string');
      expect(res.body.payload.length).toBeGreaterThan(0);
      // The fragment is the payload prefixed with `#unblind=` — caller
      // composes the full explorer URL with simple concatenation.
      expect(res.body.unblindFragment).toBe(`#unblind=${res.body.payload}`);

      // The envelope must echo back the same txId the caller asked
      // about — the explorer parser uses this to pin which tx the
      // payload describes.
      const decoded = JSON.parse(
        Buffer.from(
          res.body.payload.replace(/-/g, '+').replace(/_/g, '/')
            + '='.repeat((4 - (res.body.payload.length % 4)) % 4),
          'base64',
        ).toString('utf8'),
      );
      expect(decoded.v).toBe(1);
      expect(decoded.txId).toBe(txId);
      expect(decoded.outputs).toHaveLength(1);
      // bigints get stringified at the encoder boundary.
      expect(decoded.outputs[0].value).toBe('100');
      // `inputs` was empty → key must be absent (not `[]`) to stay
      // byte-compatible with the original v=1 wire form.
      expect('inputs' in decoded).toBe(false);
    });

    it('emits the inputs key when at least one shielded input opening is present', async () => {
      const wallet = patchedWallet();
      wallet.getShieldedUnblindingForTx = jest.fn().mockResolvedValue({
        outputs: [],
        inputs: [
          {
            index: 0,
            value: 50n,
            token: '00'.repeat(32),
            vbf: '22'.repeat(32),
          },
        ],
      });

      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${txId}`)
        .set({ 'x-wallet-id': walletId });

      expect(res.body.success).toBe(true);
      const decoded = JSON.parse(
        Buffer.from(
          res.body.payload.replace(/-/g, '+').replace(/_/g, '/')
            + '='.repeat((4 - (res.body.payload.length % 4)) % 4),
          'base64',
        ).toString('utf8'),
      );
      expect(decoded.inputs).toHaveLength(1);
      expect(decoded.inputs[0].value).toBe('50');
    });

    it('responds with success=false when the wallet has no openings for the tx', async () => {
      // Same condition the mobile AuditUnblindingRows component uses
      // to hide its "View unblinded" button: empty outputs AND empty
      // inputs means there's nothing useful to share.
      const wallet = patchedWallet();
      wallet.getShieldedUnblindingForTx = jest.fn().mockResolvedValue({
        outputs: [],
        inputs: [],
      });

      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${txId}`)
        .set({ 'x-wallet-id': walletId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/no shielded openings/i);
    });

    it('rejects a request with a missing or malformed tx id', async () => {
      // The route validator (`isString().isLength({min:64,max:64})`)
      // must run before the controller fetches the wallet — otherwise
      // we'd surface a different (and wrong) error.
      const badIds = [
        '', // missing
        'short', // too short
        'a'.repeat(63), // off-by-one short
        'a'.repeat(65), // off-by-one long
      ];
      for (const bad of badIds) {
        const res = await TestUtils.request
          .get(`/wallet/shielded/unblinding?id=${encodeURIComponent(bad)}`)
          .set({ 'x-wallet-id': walletId });
        expect(res.status).toBe(400);
      }
    });

    it('wraps wallet-lib errors as success=false instead of HTTP 500', async () => {
      const wallet = patchedWallet();
      wallet.getShieldedUnblindingForTx = jest
        .fn()
        .mockRejectedValue(new Error('boom'));

      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${txId}`)
        .set({ 'x-wallet-id': walletId });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: false, error: 'boom' });
    });

    it('reports a clear error when the wallet-lib version does not expose getShieldedUnblindingForTx', async () => {
      // Forward-compat probe: if someone runs the headless against an
      // older wallet-lib that predates the API, the controller must
      // give a clear remediation message rather than a generic crash.
      //
      // `delete wallet.getShieldedUnblindingForTx` would NOT actually
      // hide the method because it lives on HathorWallet.prototype —
      // the delete only clears any own-property shadow. Assigning
      // `null` shadows the prototype method so `typeof wallet.method
      // !== 'function'` evaluates to true (the same check the
      // controller performs).
      const wallet = patchedWallet();
      const ownDescriptor = Object.getOwnPropertyDescriptor(
        wallet,
        'getShieldedUnblindingForTx',
      );
      wallet.getShieldedUnblindingForTx = null;
      try {
        const res = await TestUtils.request
          .get(`/wallet/shielded/unblinding?id=${txId}`)
          .set({ 'x-wallet-id': walletId });
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/not supported by the installed wallet-lib/i);
      } finally {
        // Restore the original own-property shape so the next test in
        // the file sees a clean wallet (prototype method visible
        // again because the own-property shadow is gone).
        if (ownDescriptor) {
          Object.defineProperty(wallet, 'getShieldedUnblindingForTx', ownDescriptor);
        } else {
          delete wallet.getShieldedUnblindingForTx;
        }
      }
    });
  });
});
