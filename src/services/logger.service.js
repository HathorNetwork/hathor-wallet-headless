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
 * Initialize a wallet logger
 * @param {string} walletId
 */
function initializeWalletLogger(walletId) {
  const logger = buildServiceLogger(`wallet(${walletId})`);
  walletLoggers.set(walletId, logger);
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
