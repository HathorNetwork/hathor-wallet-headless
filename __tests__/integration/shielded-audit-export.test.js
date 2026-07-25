import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

/**
 * Integration coverage for the two audit-export endpoints surfaced in
 * `src/controllers/wallet/shielded.controller.js`:
 *
 *   GET /wallet/shielded/audit-keys   → { spendXpub, scanXpriv }
 *   GET /wallet/shielded/unblinding   → { payload, unblindFragment }
 *
 * These mirror the mobile wallet's "Export Privacy Keys" screen and
 * "View in Explorer unblinded" action respectively. Unit tests (see
 * __tests__/shielded.test.js) cover the controller wiring against a
 * mocked wallet; these tests run against a real precalculated wallet
 * + fullnode + tx-mining stack so they pin the contract end-to-end
 * (real BIP32 keys, real shielded send that produces real openings,
 * real explorer-fragment payload that round-trips through the
 * encoder we expose from wallet-lib).
 *
 * Prerequisites (same as the rest of the shielded-* integration suites):
 *   - @hathor/ct-crypto-node installed (native shielded crypto)
 *   - Fullnode Docker image with shielded outputs enabled
 */
describe('shielded audit-export endpoints', () => {
  /** @type WalletHelper */
  let wallet;
  /** @type WalletHelper */
  let walletB;

  beforeAll(async () => {
    try {
      wallet = WalletHelper.getPrecalculatedWallet('shielded-audit-export-1');
      walletB = WalletHelper.getPrecalculatedWallet('shielded-audit-export-2');
      await WalletHelper.startMultipleWalletsForTest([wallet, walletB]);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet.stop();
    await walletB.stop();
  });

  describe('GET /wallet/shielded/audit-keys', () => {
    it('returns a real BIP32 xpub for spend and xpriv for scan', async () => {
      const res = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set(TestUtils.generateHeader(wallet.walletId));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Real BIP32 keys serialize to base58 strings with a fixed
      // version prefix — xpub-derived keys start with "xpub" (78-byte
      // serialization → 111-char base58) and xpriv with "xprv".
      // Asserting the prefix + length range pins the key shape
      // without overcommitting to bitcore's exact base58 padding.
      expect(res.body.spendXpub).toMatch(/^xpub[a-zA-Z0-9]+$/);
      expect(res.body.spendXpub.length).toBeGreaterThanOrEqual(100);
      expect(res.body.scanXpriv).toMatch(/^xprv[a-zA-Z0-9]+$/);
      expect(res.body.scanXpriv.length).toBeGreaterThanOrEqual(100);

      // The two MUST be different — spend and scan derive from
      // separate BIP44 accounts (m/44'/280'/2'/0 vs m/44'/280'/1'/0).
      // A bug that aliased one onto the other would let a recipient
      // recover spend authority from the audit-key bundle.
      expect(res.body.spendXpub).not.toBe(res.body.scanXpriv);
    });

    it('returns the same keys on repeated calls (no entropy on each request)', async () => {
      // Deterministic derivation invariant: two calls in a row must
      // yield byte-identical strings. A bug here would silently
      // generate fresh keys per call and invalidate any audit tool
      // that cached them.
      const first = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set(TestUtils.generateHeader(wallet.walletId));
      const second = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set(TestUtils.generateHeader(wallet.walletId));

      expect(first.body.spendXpub).toBe(second.body.spendXpub);
      expect(first.body.scanXpriv).toBe(second.body.scanXpriv);
    });

    it('returns distinct key bundles for two independently-derived wallets', async () => {
      // Each wallet's shielded chain is rooted in its own seed —
      // sharing keys across wallets would be a catastrophic privacy
      // leak. This catches any accidental storage-singleton bug.
      const resA = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set(TestUtils.generateHeader(wallet.walletId));
      const resB = await TestUtils.request
        .get('/wallet/shielded/audit-keys')
        .set(TestUtils.generateHeader(walletB.walletId));

      expect(resA.body.success).toBe(true);
      expect(resB.body.success).toBe(true);
      expect(resA.body.spendXpub).not.toBe(resB.body.spendXpub);
      expect(resA.body.scanXpriv).not.toBe(resB.body.scanXpriv);
    });
  });

  describe('GET /wallet/shielded/unblinding', () => {
    /** @type {string} A txId both wallets can resolve openings against. */
    let shieldedTxId;

    beforeAll(async () => {
      // Fund + send a shielded tx so subsequent tests have at least
      // one tx with real openings to query. We send AmountShielded
      // (mode=1) so the recipient ends up owning openings the
      // unblinding endpoint can surface — the audit-tool consumer
      // wants to verify these against the explorer.
      const initialFunds = 1000;
      await wallet.injectFunds(initialFunds, 0);

      const recipientAddr0 = await walletB.getShieldedAddressAt(0);
      const recipientAddr1 = await walletB.getShieldedAddressAt(1);
      const tx = await wallet.sendTx({
        outputs: [
          { address: recipientAddr0, value: 200, shielded: 1 },
          { address: recipientAddr1, value: 100, shielded: 1 },
        ],
        destinationWallet: walletB.walletId,
      });
      expect(tx.hash).toBeDefined();
      shieldedTxId = tx.hash;
    });

    it('returns a base64url payload + unblind fragment for the recipient', async () => {
      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${shieldedTxId}`)
        .set(TestUtils.generateHeader(walletB.walletId));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.txId).toBe(shieldedTxId);
      // URL-fragment-safe base64: no `+`, no `/`, no `=` padding.
      expect(res.body.payload).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(res.body.payload.length).toBeGreaterThan(0);
      // `unblindFragment` is just `#unblind=` + payload — caller
      // composes the full explorer URL with simple concatenation.
      expect(res.body.unblindFragment).toBe(`#unblind=${res.body.payload}`);
    });

    it('round-trips through the canonical encoder shape', async () => {
      // Decode the payload and assert the envelope schema. Any drift
      // here would break the explorer parser at
      // hathor-explorer/src/utils/unblinding.js, which speaks the
      // v=1 shape with stringified bigints. We re-emit the URL-safe
      // substitution + add padding to invert the encoder.
      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${shieldedTxId}`)
        .set(TestUtils.generateHeader(walletB.walletId));

      const padded = res.body.payload.replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - (padded.length % 4)) % 4;
      const decoded = JSON.parse(
        Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8'),
      );

      expect(decoded.v).toBe(1);
      expect(decoded.txId).toBe(shieldedTxId);
      // walletB owned 2 of the tx's shielded outputs (200 + 100), so
      // the envelope must surface 2 output openings. Inputs is empty
      // (walletB didn't spend anything in this tx) → the key must be
      // ABSENT from the wire, not present-but-empty, so we don't
      // break older explorers that gate on `'inputs' in envelope`.
      expect(decoded.outputs).toHaveLength(2);
      expect('inputs' in decoded).toBe(false);
      // Values are stringified (bigint → string) because JSON can't
      // serialize bigints natively. The explorer parser revives them
      // via BigInt(...). Order isn't sorted — match by value set.
      const values = decoded.outputs.map(o => o.value).sort();
      expect(values).toEqual(['100', '200']);
      // Each entry carries the per-output vbf hex; abf is only
      // emitted for FullShielded entries (this tx is
      // AmountShielded → abf must be absent).
      for (const o of decoded.outputs) {
        expect(o.vbf).toMatch(/^[0-9a-f]{64}$/);
        expect('abf' in o).toBe(false);
      }
    });

    it('responds with success=false when the wallet has no openings for the tx', async () => {
      // The sender's wallet doesn't own any shielded output of this
      // tx (it's the spender, not the recipient — its shielded
      // change in this scenario is zero). Asking the sender for an
      // unblinding payload must surface success=false rather than
      // a stack trace.
      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${shieldedTxId}`)
        .set(TestUtils.generateHeader(wallet.walletId));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/no shielded openings/i);
    });

    it('rejects a malformed tx id at the route validator level', async () => {
      // The route declares `query("id").isString().isLength({min:64,max:64})`
      // so the controller never runs on a clearly-bogus id. Catches
      // accidental controller execution that would otherwise return
      // a confusing "no openings" 200 for a tx that couldn't exist.
      const res = await TestUtils.request
        .get('/wallet/shielded/unblinding?id=not-a-tx-id')
        .set(TestUtils.generateHeader(wallet.walletId));
      expect(res.status).toBe(400);
    });

    it('emits abf for every entry on a FullShielded tx', async () => {
      // FullShielded outputs (mode=2) hide the token UID inside an
      // asset_commitment + surjection_proof, so each output carries
      // its own asset blinding factor (abf). The unblinding payload
      // MUST emit `abf` on every entry — without it the explorer
      // can't reconstruct the asset commitment and the verification
      // step fails silently (renders the output as "Confidential").
      //
      // Funds are pre-injected from the earlier beforeAll. Note FS
      // fees are 2 HTR per output (vs 1 for AS), so the 1000 we
      // pre-funded is plenty for 100 + 100.
      const recipientAddr0 = await walletB.getShieldedAddressAt(2);
      const recipientAddr1 = await walletB.getShieldedAddressAt(3);
      const fsTx = await wallet.sendTx({
        outputs: [
          { address: recipientAddr0, value: 100, shielded: 2 },
          { address: recipientAddr1, value: 100, shielded: 2 },
        ],
        destinationWallet: walletB.walletId,
      });
      expect(fsTx.hash).toBeDefined();

      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${fsTx.hash}`)
        .set(TestUtils.generateHeader(walletB.walletId));

      expect(res.body.success).toBe(true);
      const padded = res.body.payload.replace(/-/g, '+').replace(/_/g, '/');
      const padLen = (4 - (padded.length % 4)) % 4;
      const decoded = JSON.parse(
        Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8'),
      );

      expect(decoded.outputs).toHaveLength(2);
      for (const o of decoded.outputs) {
        // abf MUST be present on every FullShielded entry.
        expect(o.abf).toMatch(/^[0-9a-f]{64}$/);
        // vbf is always present regardless of mode.
        expect(o.vbf).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('returns disjoint openings to two recipients of the same tx (sender, splitting outputs)', async () => {
      // A tx with outputs split between walletA and walletB — each
      // wallet should only see its own openings, never the
      // counterparty's. This is the cross-wallet privacy invariant
      // the audit-tool sharing flow depends on.
      //
      // To exercise this we need walletA to be a recipient too —
      // route at least one output back to its own shielded chain.
      // Make sure the minimum 2-shielded-outputs protocol rule is
      // satisfied without any output being collapsible into the
      // other wallet's view.
      const aOwnShielded = await wallet.getShieldedAddressAt(2);
      const bRecipient = await walletB.getShieldedAddressAt(4);

      const tx = await wallet.sendTx({
        outputs: [
          { address: aOwnShielded, value: 50, shielded: 1 },
          { address: bRecipient, value: 75, shielded: 1 },
        ],
        destinationWallet: walletB.walletId,
      });
      expect(tx.hash).toBeDefined();

      // walletA's view: should see exactly 1 output (its own).
      const resA = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${tx.hash}`)
        .set(TestUtils.generateHeader(wallet.walletId));
      expect(resA.body.success).toBe(true);
      const decodedA = decodePayload(resA.body.payload);
      expect(decodedA.outputs).toHaveLength(1);
      expect(decodedA.outputs[0].value).toBe('50');

      // walletB's view: should see exactly 1 output (its own).
      const resB = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${tx.hash}`)
        .set(TestUtils.generateHeader(walletB.walletId));
      expect(resB.body.success).toBe(true);
      const decodedB = decodePayload(resB.body.payload);
      expect(decodedB.outputs).toHaveLength(1);
      expect(decodedB.outputs[0].value).toBe('75');

      // And neither sees the other's vbf — accidental leak across
      // wallets would let the recipient unblind the sender's change.
      expect(decodedA.outputs[0].vbf).not.toBe(decodedB.outputs[0].vbf);
    });

    it('includes input openings when the wallet spends a shielded UTXO', async () => {
      // To deterministically exercise the input-openings path the
      // sender must spend a SHIELDED UTXO (not transparent) — and
      // the cleanest way to guarantee that is to have the sending
      // wallet hold ONLY shielded balance. `walletB` fits exactly:
      // every prior test in this file injected funds into `wallet`,
      // never into `walletB`, so `walletB` has only the shielded
      // outputs it received from `wallet` along the way (AS in
      // test 1 and 6, FS in test 5). The UTXO selector has no
      // transparent inputs to fall back to and MUST pick shielded.
      const recipientAddr = await wallet.getShieldedAddressAt(20);
      const ownChangeAddr = await walletB.getShieldedAddressAt(20);
      const spendTx = await walletB.sendTx({
        outputs: [
          { address: recipientAddr, value: 30, shielded: 1 },
          { address: ownChangeAddr, value: 50, shielded: 1 },
        ],
        destinationWallet: wallet.walletId,
      });
      expect(spendTx.hash).toBeDefined();

      const res = await TestUtils.request
        .get(`/wallet/shielded/unblinding?id=${spendTx.hash}`)
        .set(TestUtils.generateHeader(walletB.walletId));

      expect(res.body.success).toBe(true);
      const decoded = decodePayload(res.body.payload);

      // walletB owns the input openings (parents of the spent
      // shielded UTXOs) AND its own change output → both arrays
      // must be non-empty, and the `inputs` key MUST be present in
      // the envelope (regression: the encoder used to omit `inputs`
      // even when non-empty if outputs were also present, breaking
      // the explorer's verification of spends).
      expect(decoded.inputs).toBeDefined();
      expect(decoded.inputs.length).toBeGreaterThanOrEqual(1);
      expect(decoded.outputs).toBeDefined();

      // walletB's own change appears in outputs (50 HTR). The
      // recipient's 30 is NOT in walletB's payload — walletB doesn't
      // have wallet's vbf for that entry. Catches a cross-wallet
      // leak on the sender side.
      const ourValues = decoded.outputs.map(o => o.value);
      expect(ourValues).toContain('50');
      expect(ourValues).not.toContain('30');

      // Each input opening carries the standard fields the explorer
      // needs to verify the spend authority — same shape as outputs.
      // We don't assert abf presence/absence per-input because the
      // selector might have picked AS parents (no abf), FS parents
      // (abf present), or a mix; the per-entry `abf` is conditional
      // on the input's parent mode, not a property of "inputs are
      // shielded" in general.
      // Token UID form on the wire: wallet-lib uses `'00'` for native
      // HTR (matching the transparent-output convention) and 64-char
      // hex for custom tokens. The explorer parser accepts both
      // shapes — we just need a non-empty string per entry. All txs
      // in this suite are HTR so we expect `'00'`, but the
      // /(0{2}|[0-9a-f]{64})/ pattern keeps the assertion robust if
      // future tests introduce custom-token openings.
      for (const inp of decoded.inputs) {
        expect(typeof inp.index).toBe('number');
        expect(inp.token).toMatch(/^(00|[0-9a-f]{64})$/);
        expect(inp.vbf).toMatch(/^[0-9a-f]{64}$/);
      }
    });
  });
});

/**
 * Decode the URL-fragment-safe base64 payload back into the envelope
 * object the tests want to assert on. Reverses the encoder's URL-safe
 * substitution and re-pads to a multiple of 4. Kept inline to the
 * test file because production code shouldn't decode the payload —
 * that's strictly the explorer's job.
 */
function decodePayload(payload) {
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return JSON.parse(Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8'));
}
