/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EventEmitter } = require('events');

const eventBus = 'message';

const WalletEventMap = {
  state: 'wallet:state',
  'new-tx': 'wallet:new-tx',
  'udpate-tx': 'wallet:udpate-tx',
};

const ConnectionEventMap = {
  state: 'conn:state',
  'wallet-update': 'conn:wallet-update',
  'best-block-update': 'conn:best-block-update',
  'wallet-load-partial-update': 'conn:wallet-load-partial-update',
};

const AllEvents = [...Object.values(WalletEventMap), ...Object.values(ConnectionEventMap)];

// TODO: methods and properties to handle the wallet events
class HathorEvents extends EventEmitter {
  subscribeHathorWallet(walletId, hwallet) {
    // Wallet events

    // state
    hwallet.on('state', state => {
      const type = WalletEventMap.state;
      const data = { type, walletId, data: state };

      this.emit(type, data);
      this.emit(eventBus, data);
    });

    // new-tx
    hwallet.on('new-tx', tx => {
      // XXX: Check if it's from the wallet?
      const type = WalletEventMap['new-tx'];
      const data = { type, walletId, data: tx };

      this.emit(type, data);
      this.emit(eventBus, data);
    });

    // update-tx
    hwallet.on('update-tx', tx => {
      // XXX: Check if it's from the wallet?
      const type = WalletEventMap['update-tx'];
      const data = { type, walletId, data: tx };

      this.emit(type, data);
      this.emit(eventBus, data);
    });

    // Connection events

    // state
    hwallet.conn.on('state', state => {
      const type = ConnectionEventMap.state;
      const data = { type: walletId, data: state };

      this.emit(type, data);
      this.emit(eventBus, data);
    });

    // wallet-update
    hwallet.conn.on('wallet-update', wsData => {
      const type = ConnectionEventMap['wallet-update'];
      const data = { type: walletId, data: wsData };

      this.emit(type, data);
      this.emit(eventBus, data);
    });

    // best-block-update
    hwallet.conn.on('best-block-update', wsData => {
      const type = ConnectionEventMap['best-block-update'];
      const data = { type: walletId, data: wsData };

      this.emit(type, data);
      this.emit(eventBus, data);
    });

    // wallet-load-partial-update
    hwallet.conn.on('wallet-load-partial-update', wsData => {
      const type = ConnectionEventMap['wallet-load-partial-update'];
      const data = { type, walletId, data: wsData };

      this.emit(type, data);
      this.emit(eventBus, data);
    });
  }
}

const notificationBus = new HathorEvents();

module.exports = {
  notificationBus,
  eventBus,
  WalletEventMap,
  ConnectionEventMap,
  AllEvents,
};
