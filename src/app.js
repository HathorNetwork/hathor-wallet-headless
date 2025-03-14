/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import morgan from 'morgan';

import apiKeyAuth from './middlewares/api-key-auth.middleware';
import { ConfigErrorHandler } from './middlewares/config-error-handler.middleware';
import { ReadonlyErrorHandler } from './middlewares/xpub-error-handler.middleware';
import { buildAppLogger } from './logger';
import mainRouter from './routes/index.routes';
import { initHathorLib } from './helpers/wallet.helper';
import { loggerMiddleware } from './middlewares/logger.middleware';

const { bigIntUtils } = require('@hathor/wallet-lib');

// Initializing Hathor Lib

const createApp = config => {
  initHathorLib(config);

  const logger = buildAppLogger(config);

  // Initializing ExpressJS
  const app = express();

  // To deal with BigInts in JSONs, which are used mainly in transaction output values, we need
  // to configure both a custom JSON replacer and a reviver, below.

  // We configure a custom JSON replacer that Express will use to stringify API responses.
  app.set('json replacer', bigIntUtils.JSONBigInt.bigIntReplacer);

  // We configure a custom JSON reviver that Express will use to parse API requests.
  app.use(express.json({
    reviver: bigIntUtils.JSONBigInt.bigIntReviver,
  }));

  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.httpLogFormat || 'combined', { stream: logger.stream }));
  app.use(loggerMiddleware);

  if (config.http_api_key) {
    app.use(apiKeyAuth(config.http_api_key));
  }

  app.use(mainRouter);
  app.use(ConfigErrorHandler);
  app.use(ReadonlyErrorHandler);
  app.use((err, req, res, next) => {
    req.logger.error(err.stack);
    res.status(err.statusCode || 500).json({ message: err.message, stack: err.stack });
  });

  return app;
};

export default createApp;
