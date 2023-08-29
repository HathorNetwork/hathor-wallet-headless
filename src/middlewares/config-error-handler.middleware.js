/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { NonRecoverableConfigChangeError }  = require('../errors');

const NONRECOVERABLE_ERROR = 'A non recoverable change in the config was made, the service will shutdown.';

function ConfigErrorHandler(err, req, res, next) {
  if (err instanceof NonRecoverableConfigChangeError) {
    res.status(200);
    res.send({ success: false, error: NONRECOVERABLE_ERROR });
    process.exit(0);
  }
  return next(err);
}

module.exports = {
  ConfigErrorHandler,
};
