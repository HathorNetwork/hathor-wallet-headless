/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { WebSocket } from 'ws';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { eventBus } from '../services/notification.service';

/**
 * @type {WebSocket[]}
 */
let sockets = [];

/**
 * getter for sockets variable.
 * Used for tests
 *
 * @returns {WebSocket[]}
 */
export function getSockets() {
  return sockets;
}

export const getSettings = () => {
  const { argv } = yargs(hideBin(process.argv));

  const port = argv.plugin_ws_port || process.env.HEADLESS_PLUGIN_WS_PORT || 8008;
  return { port };
};

export function connectionHandler(socket) {
  sockets.push(socket);
  console.log('New websocket connection!');
  socket.on('close', () => {
    // Remove from connections
    sockets = sockets.filter(s => s !== socket);
  });
}

export function eventHandler(data) {
  // Broadcast to all live connections
  for (const socket of sockets) {
    socket.send(JSON.stringify(data));
  }
}

/* istanbul ignore next */
export const init = async bus => {
  const { port } = getSettings();

  // Prepare event handling
  bus.on(eventBus, eventHandler);

  const server = new WebSocket.Server({ port });
  server.on('connection', connectionHandler);
  console.log('plugin[ws]: loaded');
};
