/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EventEmitter } = require('events');

const { getWalletBalanceForTx } = require('../helpers/notification.helper');

const EVENTBUS_EVENT_NAME = 'message';

const WalletEventMap = {
  state: 'wallet:state-change',
  'new-tx': 'wallet:new-tx',
  'udpate-tx': 'wallet:udpate-tx',
};

const ConnectionEventMap = {
  state: 'node:state-change',
  'wallet-update': 'node:wallet-update',
  'best-block-update': 'node:best-block-update',
  'wallet-load-partial-update': 'node:wallet-load-partial-update',
};

const AllEvents = [...Object.values(WalletEventMap), ...Object.values(ConnectionEventMap)];

class HathorEvents extends EventEmitter {
  subscribeHathorWallet(walletId, hwallet) {
    // Wallet events

    // state
    hwallet.on('state', state => {
      const type = WalletEventMap.state;
      const data = { type, walletId, data: state };

      switch (state) {
        case 0:
          data.stateName = 'Closed';
          break;
        case 1:
          data.stateName = 'Connecting'
          break;
        case 2:
          data.stateName = 'Syncing'
          break;
        case 3:
          data.stateName = 'Ready'
          break;
        case 4:
          data.stateName = 'Error'
          break;
      }

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });

    // new-tx
    hwallet.on('new-tx', tx => {
      const type = WalletEventMap['new-tx'];
      const data = { type, walletId, data: tx, balance: getWalletBalanceForTx(hwallet, tx) };

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });

    // update-tx
    hwallet.on('update-tx', tx => {
      const type = WalletEventMap['update-tx'];
      const data = { type, walletId, data: tx, balance: getWalletBalanceForTx(hwallet, tx) };

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });

    // Connection events

    // state
    hwallet.conn.on('state', state => {
      const type = ConnectionEventMap.state;
      const data = { type, walletId, data: state };

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });

    // wallet-update
    hwallet.conn.on('wallet-update', wsData => {
      const type = ConnectionEventMap['wallet-update'];
      const data = { type, walletId, data: wsData };

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });

    // best-block-update
    hwallet.conn.on('best-block-update', wsData => {
      const type = ConnectionEventMap['best-block-update'];
      const data = { type, walletId, data: wsData };

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });

    // wallet-load-partial-update
    hwallet.conn.on('wallet-load-partial-update', wsData => {
      const type = ConnectionEventMap['wallet-load-partial-update'];
      const data = { type, walletId, data: wsData };

      this.emit(type, data);
      this.emit(EVENTBUS_EVENT_NAME, data);
    });
  }
}

const notificationBus = new HathorEvents();

module.exports = {
  notificationBus,
  EVENTBUS_EVENT_NAME,
  WalletEventMap,
  ConnectionEventMap,
  AllEvents,
};
