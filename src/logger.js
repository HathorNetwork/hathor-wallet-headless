/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import util from 'util';
import winston from 'winston';

let logger = null;

function buildLogger(config) {
  if (logger) {
    return logger;
  }

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
  for (const [key, item] of Object.entries(config.logging || {})) {
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
    defaultMeta: { service: 'wallet' },
    transports,
  });

  // create a stream object with a 'write' function that will be used by `morgan`
  logger.stream = {
    write(message, encoding) {
      // use the 'info' log level so the output will be picked up by
      // both transports (file + console)
      logger.info(message.trim(), {
        service: 'http',
      });
    },
  };

  console.log = (...args) => logger.info.call(logger, ...args);
  console.info = (...args) => logger.info.call(logger, ...args);
  console.warn = (...args) => logger.warn.call(logger, ...args);
  console.error = (...args) => logger.error.call(logger, ...args);
  console.debug = (...args) => logger.debug.call(logger, ...args);

  return logger;
}

// This fixes some logs where Github code scanning complains about a `Log Injection` possibility
const sanitizeLogInput = input => String(input).replace(/\n|\r/g, '');

export { sanitizeLogInput };

export default buildLogger;
