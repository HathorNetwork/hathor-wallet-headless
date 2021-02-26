/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import winston from 'winston';

import config from './config';

const myFormat = winston.format.printf(({ level, message, service, timestamp, ...args }) => {
  return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(args).length > 0 ? JSON.stringify(args) : ''}`;
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

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  ),
  defaultMeta: { service: 'wallet' },
  transports: transports,
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
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

export default logger;
