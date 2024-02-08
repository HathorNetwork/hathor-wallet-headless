/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* istanbul ignore file */
import { fork } from 'child_process';
import { config as hathorLibConfig } from '@hathor/wallet-lib';

import createApp from './app';
import { EVENTBUS_EVENT_NAME, notificationBus } from './services/notification.service';
import version from './version';
import settings from './settings';

async function startHeadless() {
  await settings.setupConfig();
  const config = settings.getConfig();
  if (config.enabled_plugins && config.enabled_plugins.length > 0) {
    // There are configured plugins, we should start the child process

    // We will pass the argv we receive since the config module may need these arguments
    // options.silent will pipe child stdout to main process
    // options.env will spawn child with the same environment as main process (for config)
    const child = fork(
      `${__dirname}/plugins/child.js`,
      process.argv.slice(2),
      { silent: true, env: process.env },
    );
    console.log(`child process started with pid ${child.pid}`);

    process.on('exit', () => {
      if (child.connected || !child.killed) {
        console.log('disconnecting from child.');
        child.disconnect();
      }
    });

    // This is to unify logs from child and main process.
    child.stdout.on('data', data => {
      // eslint-disable-next-line no-console
      console.log(data.toString());
    });

    // Pipe child stderr to stdout.
    child.stderr.on('data', data => {
      // eslint-disable-next-line no-console
      console.error(data.toString());
    });

    child.on('error', err => {
      console.error(`child process error: ${err.message}`);
    });

    child.on('disconnect', (code, signal) => {
      console.log(`child process disconnected from IPC channel with (${code} and ${signal})`);
      // Killing child just in case it has not yet died.
      child.kill(); // SIGTERM
    });

    child.on('exit', (code, signal) => {
      console.log(`child process exited with code ${code} or due to signal ${signal}.`);
      // Try to exit with the same signal as the child process.
      process.exit(code || 127); // Have a default to indicate it was not a normal termination
    });

    // Pipe wallet events to child process
    notificationBus.on(EVENTBUS_EVENT_NAME, data => {
      if (child.killed || !child.connected) {
        // The child has been lost, cannot send to it
        return;
      }
      // Sending event data
      child.send(data);
    });
  }

  // Start main process

  const app = createApp(config);

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
    enabled_plugins: config.enabled_plugins,
  });

  app.listen(config.http_port, config.http_bind_address, () => {
    console.log(`Listening on ${config.http_bind_address}:${config.http_port}...`);
  });
}

startHeadless();
