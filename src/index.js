/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import morgan from 'morgan';
import { config as hathorLibConfig, wallet as oldWalletUtils } from '@hathor/wallet-lib';

import config from './config';
import apiKeyAuth from './middlewares/api-key-auth.middleware';
import logger from './logger';
import version from './version';
import mainRouter from './routes/index.routes';

// Initializing Hathor Lib
export const initHathorLib = () => {
  if (config.txMiningUrl) {
    hathorLibConfig.setTxMiningUrl(config.txMiningUrl);
  }

  if (config.txMiningApiKey) {
    hathorLibConfig.setTxMiningApiKey(config.txMiningApiKey);
  }

  // Set package version in user agent
  // We use this string to parse the version from user agent
  // in some of our services, so changing this might break another service
  hathorLibConfig.setUserAgent(`Hathor Wallet Headless / ${version}`);

  // Those configurations will be set when starting the wallet
  // however we can already set them because they are fixed
  // for all wallets and it's useful if we need to run any request
  // to the full node before starting a wallet
  hathorLibConfig.setServerUrl(config.server);
  hathorLibConfig.setNetwork(config.network);
};

initHathorLib();

// Initializing ExpressJS
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.httpLogFormat || 'combined', { stream: logger.stream }));

// Configurations
if (config.gapLimit) {
  console.log(`Set GAP LIMIT to ${config.gapLimit}`);
  oldWalletUtils.setGapLimit(config.gapLimit);
}
if (config.http_api_key) {
  app.use(apiKeyAuth(config.http_api_key));
}

app.use(mainRouter);

// Logging relevant variables on the console
console.log('Starting Hathor Wallet...', {
  wallet: version,
  version: process.version,
  platform: process.platform,
  pid: process.pid,
});

console.log('Configuration...', {
  network: config.network,
  server: config.server,
  txMiningUrl: hathorLibConfig.getTxMiningUrl(),
  tokenUid: config.tokenUid,
  apiKey: config.http_api_key,
  gapLimit: config.gapLimit,
  connectionTimeout: config.connectionTimeout,
});

// Adding server to HTTP port only if this is not a test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.http_port, config.http_bind_address, () => {
    console.log(`Listening on ${config.http_bind_address}:${config.http_port}...`);
  });
}

export default app;
