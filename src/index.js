/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { config as hathorLibConfig } from '@hathor/wallet-lib';

import config from './config';
import createApp from './app';
import { loadPlugins } from './loader';
import { notificationBus } from './services/notification.service';

import version from './version';

const main = async () => {
  const plugins = await loadPlugins();
  const app = createApp();

  // Start plugins

  for (const plugin of plugins) {
    /**
     * Startup of each plugin will be async
     * because some may require awaiting external services.
     */
    await plugin.init(notificationBus, app);
  }

  // Start webserver

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
};

main();
