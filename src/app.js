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
import buildLogger from './logger';
import mainRouter from './routes/index.routes';
import { initHathorLib } from './helpers/wallet.helper';

// Initializing Hathor Lib

const createApp = config => {
  initHathorLib(config);

  const logger = buildLogger(config);

  // Initializing ExpressJS
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.httpLogFormat || 'combined', { stream: logger.stream }));

  if (config.http_api_key) {
    app.use(apiKeyAuth(config.http_api_key));
  }

  app.use(mainRouter);
  app.use(ConfigErrorHandler);
  app.use(ReadonlyErrorHandler);
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ message: err.message, stack: err.stack });
  });

  return app;
};

export default createApp;
