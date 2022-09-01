/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { EventEmitter } = require('events');

const eventBusName = 'event';

// TODO: methods and properties to handle the wallet events
class HathorEvents extends EventEmitter {
  subscribeHathorWallet(walletId, hwallet) {
    // Wallet events

    // state
    hwallet.on('state', state => {
      const data = { walletId, state };

      this.emit('wallet:state', data);
      this.emit(eventBusName, { type: 'wallet:state', ...data });
    });

    // new-tx
    hwallet.on('new-tx', tx => {
      // XXX: Check if it's from the wallet?

      const data = { walletId, tx };
      this.emit('wallet:new-tx', data);
      this.emit(eventBusName, { type: 'wallet:new-tx', ...data });
    });

    // update-tx
    hwallet.on('update-tx', tx => {
      // XXX: Check if it's from the wallet?

      const data = { walletId, tx };
      this.emit('wallet:update-tx', data);
      this.emit(eventBusName, { type: 'wallet:update-tx', ...data });
    });

    // Connection events

    // state
    hwallet.conn.on('state', state => {
      const data = { walletId, state };

      this.emit('conn:state', data);
      this.emit(eventBusName, { type: 'conn:state', ...data });
    });

    // wallet-update
    hwallet.conn.on('wallet-update', wsData => {
      const data = { walletId, wsData };

      this.emit('conn:wallet-update', data);
      this.emit(eventBusName, { type: 'conn:wallet-update', ...data });
    });

    // best-block-update
    hwallet.conn.on('best-block-update', wsData => {
      const data = { walletId, wsData };

      this.emit('conn:best-block-update', data);
      this.emit(eventBusName, { type: 'conn:best-block-update', ...data });
    });

    // wallet-load-partial-update
    hwallet.conn.on('wallet-load-partial-update', wsData => {
      const data = { walletId, wsData };

      this.emit('conn:wallet-load-partial-update', data);
      this.emit(eventBusName, { type: 'conn:wallet-load-partial-update', ...data });
    });
  }
}

const notificationBus = new HathorEvents();

module.exports = {
  notificationBus,
  eventBusName,
};
