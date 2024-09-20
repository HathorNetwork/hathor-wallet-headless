/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { getLogger } = require('../services/logger.service');

/**
 * Inject the logger on the request instance.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
async function loggerMiddleware(req, _res, next) {
  const logger = getLogger(req);
  req.logger = logger;
  next();
}

module.exports = {
  loggerMiddleware,
};
