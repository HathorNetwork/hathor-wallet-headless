/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { errors } = require('@hathor/wallet-lib');

/**
 * Answer a request the wallet's shielded keys can't serve, such as a shielded
 * address on a multisig or read-only wallet, or before the view key is
 * unlocked. wallet-lib throws ShieldedKeyError with an errorCode
 * (e.g. 'shielded-multisig', 'shielded-no-keys', 'shielded-locked') that tells
 * the caller why.
 */
function ShieldedKeyErrorHandler(err, req, res, next) {
  if (err instanceof errors.ShieldedKeyError) {
    res.status(403);
    return res.send({ success: false, error: err.message, errorCode: err.errorCode });
  }
  return next(err);
}

module.exports = {
  ShieldedKeyErrorHandler,
};
