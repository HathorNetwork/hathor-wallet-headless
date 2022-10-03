/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { errors } = require('@hathor/wallet-lib');

const READONLY_ERROR = 'Attempted to access a write protected method from a readonly wallet.';

function ReadonlyErrorHandler(err, req, res, next) {
  if (err instanceof errors.WalletFromXPubGuard) {
    res.status(400);
    return res.send({ success: false, error: READONLY_ERROR });
  }
  return next(err);
}

module.exports = {
  ReadonlyErrorHandler,
};
