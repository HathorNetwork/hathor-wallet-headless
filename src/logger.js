/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import util from 'util';
import winston from 'winston';
import { getConfig } from './settings';
/** @import { Configuration } from './settings' */

/** @type {winston.Logger} */
let logger = null;

/**
 * Build a winston logger instance.
 *
 * @param {Configuration} config
 * @param {string} defaultService
 * @return {winston.Logger}
 */
function buildLogger(config, defaultService) {
  const myFormat = winston.format.printf(({ level, message, service, timestamp, ...args }) => {
    let argsStr = '';
    if (Object.keys(args).length > 0) {
      // Adapted from https://github.com/winstonjs/logform/blob/master/pretty-print.js
      const stripped = { ...args };

      delete stripped[Symbol.for('level')];
      delete stripped[Symbol.for('message')];
      delete stripped[Symbol.for('splat')];

      argsStr = util.inspect(stripped, { compact: true, breakLength: Infinity });
    }
    return `${timestamp} [${service}] ${level}: ${message} ${argsStr}`;
  });

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        myFormat,
      ),
      level: config.consoleLevel || 'info',
    }),
  ];

  // eslint-disable-next-line no-unused-vars
  for (const [_key, item] of Object.entries(config.logging || {})) {
    transports.push(new winston.transports.File({
      format: winston.format.combine(
        winston.format.json(),
      ),
      filename: item.filename,
      level: item.level,
      colorize: false,
    }));
  }

  logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    ),
    defaultMeta: { service: defaultService },
    transports,
  });
}

/**
 * Build an application logger instance.
 *
 * @param {Configuration} config
 * @return {winston.Logger}
 */
export function buildAppLogger(config) {
  if (logger) {
    return logger;
  }

  const appLogger = buildLogger(config, 'wallet');

  // create a stream object with a 'write' function that will be used by `morgan`
  appLogger.stream = {
    write(message, _encoding) {
      // use the 'info' log level so the output will be picked up by
      // both transports (file + console)
      appLogger.info(message.trim(), {
        service: 'http',
      });
    },
  };

  console.log = (...args) => appLogger.info.call(appLogger, ...args);
  console.info = (...args) => appLogger.info.call(appLogger, ...args);
  console.warn = (...args) => appLogger.warn.call(appLogger, ...args);
  console.error = (...args) => appLogger.error.call(appLogger, ...args);
  console.debug = (...args) => appLogger.debug.call(appLogger, ...args);

  return appLogger;
}

// This fixes some logs where Github code scanning complains about a `Log Injection` possibility
const sanitizeLogInput = input => String(input).replace(/\n|\r/g, '');

export { sanitizeLogInput };

/**
 * Build a wallet logger instance.
 *
 * @param {string} walletId
 * @return {winston.Logger}
 */
export function buildWalletLogger(walletId) {
  const config = getConfig();
  return buildLogger(config, sanitizeLogInput(`wallet(${walletId})`));
}

export default buildLogger;
