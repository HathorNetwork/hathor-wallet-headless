/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import morgan from 'morgan';
import { config as hathorLibConfig, wallet as oldWalletUtils } from '@hathor/wallet-lib';
// TODO: Import from '@hathor/wallet-lib/lib/config' as soon as it's available
import { SWAP_SERVICE_MAINNET_BASE_URL, SWAP_SERVICE_TESTNET_BASE_URL } from './constants';

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

  // Configures Atomic Swap Service url. Prefers explicit config input, then mainnet or testnet
  if (config.atomicSwapService) {
    hathorLibConfig.setSwapServiceBaseUrl(config.atomicSwapService);
  } else if (config.network === 'mainnet') {
    hathorLibConfig.setSwapServiceBaseUrl(SWAP_SERVICE_MAINNET_BASE_URL);
  } else {
    hathorLibConfig.setSwapServiceBaseUrl(SWAP_SERVICE_TESTNET_BASE_URL);
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

const createApp = () => {
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

  return app;
};

export default createApp;
