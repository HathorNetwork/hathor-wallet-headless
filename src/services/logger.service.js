/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { buildAppLogger, buildServiceLogger } from '../logger';

/**
 * Wallet loggers mapped by walletId
 * @type {Map<string, import('winston').Logger>}
 */
const walletLoggers = new Map();

/**
 * @typedef {Object} ILogger
 * @property {(...args) => void} debug - Log message at the debug level
 * @property {(...args) => void} info - Log message at the info level
 * @property {(...args) => void} warn - Log message at the warn level
 * @property {(...args) => void} error - Log message at the error level
 */

/**
 * @param {import('winston').Logger} logger
 * @returns {ILogger}
 */
function buildLibLogger(logger) {
  return {
    debug: (...args) => logger.debug.call(logger, ...args),
    info: (...args) => logger.info.call(logger, ...args),
    warn: (...args) => logger.warn.call(logger, ...args),
    error: (...args) => logger.error.call(logger, ...args),
  };
}

/**
 * Initialize a wallet logger
 * @param {string} walletId
 * @returns {import('winston').Logger}
 */
function initializeWalletLogger(walletId) {
  const logger = buildServiceLogger(`wallet(${walletId})`);
  const libLogger = buildLibLogger(logger);
  return [logger, libLogger];
}

/**
 * @param {import('express').Request} req
 * @returns {import('winston').Logger}
 */
function getLogger(req) {
  let walletId;

  if (req.walletId) {
    walletId = req.walletId;
  } else if (req.headers['x-wallet-id']) {
    walletId = req.headers['x-wallet-id'];
  } else if (req.body && req.body['wallet-id']) {
    walletId = req.body['wallet-id'];
  } else {
    // There is no wallet for this request
    // will return the app logger instance.
    return buildAppLogger();
  }

  const logger = walletLoggers.get(walletId);
  if (!logger) {
    return buildServiceLogger(`uninitialized_wallet(${walletId})`);
  }
  return logger;
}

export { walletLoggers, initializeWalletLogger, getLogger };
