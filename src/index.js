/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { fork } from 'child_process';
import { config as hathorLibConfig } from '@hathor/wallet-lib';

import config from './config';
import createApp from './app';
import { eventBus, notificationBus } from './services/notification.service';
import version from './version';

// Starting child process if not on test environment
if (process.env.NODE_ENV !== 'test') {
  if (config.enabled_plugins && config.enabled_plugins.length > 0) {
    // There are configured plugins, we should start the child process

    // options.silent will pipe child stdout to main process
    // options.env will spawn child with the same environment as main process (for config)
    // XXX: filter environment variables to pass??
    const child = fork(`${__dirname}/child.js`, [], { silent: true, env: process.env });

    child.stdout.on('data', data => {
      // This is to unify logs from child and main process.
      console.log(data);
      // XXX: do something with child logs?
    });

    child.on('message', d => {
      // XXX: Allows plugins to send events to main process??
    });

    notificationBus.on(eventBus, data => {
      // Pipe wallet events to child process
      child.send(data);
    });
  }
}

// Start main process

const app = createApp();

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
