/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  NonRecoverableConfigChangeError,
  UnavailableConfigError,
} = require('../errors');

const NONRECOVERABLE_ERROR = 'A non recoverable change in the config was made, the service will shutdown.';
const UNAVAILABLE_ERROR = 'Service currently unavailable';

function ConfigErrorHandler(err, req, res, next) {
  if (err instanceof NonRecoverableConfigChangeError) {
    res.status(200);
    res.send({ success: false, error: NONRECOVERABLE_ERROR });
    process.exit(0);
  } else if (err instanceof UnavailableConfigError) {
    res.status(503);
    res.send({ success: false, error: UNAVAILABLE_ERROR });
  } else {
    // Only call next if we could not handle the error
    return next(err);
  }
}

module.exports = {
  ConfigErrorHandler,
};
