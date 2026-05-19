/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { matchedData } = require('express-validator');
const { shielded: walletLibShielded } = require('@hathor/wallet-lib');
const { parametersValidation } = require('../../helpers/validations.helper');
const { DEFAULT_PIN } = require('../../constants');

/**
 * @typedef {import('@hathor/wallet-lib').HathorWallet} HathorWallet
 * @typedef {import('express').Request & { wallet: HathorWallet }} Request
 * @typedef {import('express').Response} Response
 */

// Single source of truth for the explorer unblinding envelope —
// wallet-lib re-exports `encodeShieldedUnblindingPayload` via the
// `shielded` namespace so every producer (mobile wallet, headless,
// audit) emits byte-identical payloads. Don't re-implement the
// envelope here; if the explorer ever changes the fragment format,
// the lib is the only place that needs to track it.
const encodeUnblindingPayload = walletLibShielded.encodeShieldedUnblindingPayload;

/**
 * GET `/wallet/shielded/audit-keys`
 *
 * Returns the wallet's shielded audit-key pair:
 *   - `spendXpub`: the spend-chain xpub (m/44'/280'/2'/0). Holder can
 *     derive every shielded spend address (and therefore see incoming
 *     activity) but cannot spend.
 *   - `scanXpriv`: the scan-chain xpriv (m/44'/280'/1'/0). Holder can
 *     decrypt every incoming shielded output addressed to the wallet
 *     (read access). Cannot spend.
 *
 * Together these grant the shielded-outputs-audit tool full read
 * access to the wallet's shielded history — same key pair the mobile
 * "Export Privacy Keys" screen surfaces (see
 * hathor-wallet-mobile/src/screens/ExportPrivacyKeys.js). For wallets
 * created before shielded outputs were enabled (no shielded keys on
 * disk), responds with `success: false`.
 *
 * Sensitivity: the scan xpriv is bearer-equivalent for shielded
 * receive privacy. Headless is assumed to run in a controlled
 * environment behind whatever auth the operator wraps it in.
 */
async function exportShieldedAuditKeys(req, res) {
  /** @type {HathorWallet} */
  const { wallet } = req;
  try {
    const spendXpub = await wallet.storage.getSpendXPubKey();
    if (!spendXpub) {
      res.send({
        success: false,
        error:
          'This wallet has no shielded keys. They are only present on wallets '
          + 'created after the shielded outputs feature was enabled.',
      });
      return;
    }
    const scanXpriv = await wallet.storage.getScanXPrivKey(DEFAULT_PIN);
    res.send({ success: true, spendXpub, scanXpriv });
  } catch (err) {
    res.send({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/**
 * GET `/wallet/shielded/unblinding?id=<txId>`
 *
 * Returns the explorer-unblinding payload for a tx that the wallet
 * owns shielded openings of (either as recipient of shielded outputs,
 * or as spender of shielded inputs whose parent output it owns).
 *
 * Response shape:
 *   {
 *     success: true,
 *     txId: "...",
 *     payload: "<base64url envelope>",
 *     unblindFragment: "#unblind=<base64url envelope>",
 *   }
 *
 * (callers compose the explorer URL themselves: `<EXPLORER_BASE>/
 *   transaction/<txId><unblindFragment>`)
 *
 * `payload` is the bare envelope. `unblindFragment` is the same value
 * pre-prefixed with `#unblind=` so callers can drop it into any
 * explorer URL via string concatenation. The explorer fragment parser
 * lives at hathor-explorer/src/utils/unblinding.js.
 *
 * When the wallet has no openings to share for this tx (transparent-
 * only tx, or a shielded tx the wallet has no decoded outputs of and
 * doesn't own the parent of any shielded input), responds with
 * `success: false`. This is the same condition the mobile
 * `AuditUnblindingRows` component uses to hide its "View unblinded"
 * button.
 */
async function getShieldedUnblindingPayload(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /** @type {HathorWallet} */
  const { wallet } = req;
  const { id } = matchedData(req, { locations: ['query'] });

  if (typeof wallet.getShieldedUnblindingForTx !== 'function') {
    res.send({
      success: false,
      error:
        'Shielded unblinding is not supported by the installed wallet-lib version. '
        + 'Upgrade @hathor/wallet-lib to a version that exposes getShieldedUnblindingForTx.',
    });
    return;
  }

  try {
    const result = await wallet.getShieldedUnblindingForTx(id);
    const outputs = (result && result.outputs) || [];
    const inputs = (result && result.inputs) || [];

    if (outputs.length === 0 && inputs.length === 0) {
      res.send({
        success: false,
        error:
          `Wallet has no shielded openings for tx ${id}. Either the tx is `
          + 'transparent-only, or the wallet did not decrypt any of its '
          + 'shielded outputs and does not own the parent of any shielded input.',
      });
      return;
    }

    const payload = encodeUnblindingPayload(id, outputs, inputs);
    res.send({
      success: true,
      txId: id,
      payload,
      unblindFragment: `#unblind=${payload}`,
    });
  } catch (err) {
    res.send({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

module.exports = {
  exportShieldedAuditKeys,
  getShieldedUnblindingPayload,
};
