/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { WebSocket } from 'ws';
import { parse } from 'url';

import { eventBusName, notificationBus } from '../services/notification.service';

export const init = async (server, app) => {
  // const server = new WebSocket.Server({ port: 8008 });
  const wsServer = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    // TODO: Handle apikeys, first address confirmation, etc.

    const { pathname } = parse(req.url);

    if (pathname === '/ws') {
      wsServer.handleUpgrade(req, socket, head, wsocket => {
        wsServer.emit('connection', wsocket, req);
      });
    } else {
      socket.destroy();
    }
  });

  let sockets = [];
  wsServer.on('connection', socket => {
    sockets.push(socket);

    console.log('New websocket connection!');

    socket.on('close', () => {
      // Remove from connections
      sockets = sockets.filter(s => s !== socket);
    });

    // TODO: client can subscribe to wallets using the walletId
    // TODO: allow client to emit events to the bus?
  });

  notificationBus.on(eventBusName, data => {
    // XXX: broadcast by default
    for (const socket of sockets) {
      socket.send(JSON.stringify(data));
    }
  });

  console.log('WEBSOCKET PLUGIN LOADED!');
};
