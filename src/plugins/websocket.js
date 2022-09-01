/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { WebSocket } from 'ws';

import { eventBusName } from '../services/notification.service';

export const init = (bus, app) => {
  const server = new WebSocket.Server({ port: 8008 });

  let sockets = [];
  server.on('connection', socket => {
    sockets.push(socket);

    console.log('New websocket connection!');

    socket.on('close', () => {
      // Remove from connections
      sockets = sockets.filter(s => s !== socket);
    });

    // TODO: client can subscribe to wallets using the walletId
    // TODO: allow client to emit events to the bus?
  });

  bus.on(eventBusName, data => {
    // XXX: broadcast by default
    for (const socket of sockets) {
      socket.send(JSON.stringify(data));
    }
  });

  console.log('WEBSOCKET PLUGIN LOADED!');
};
