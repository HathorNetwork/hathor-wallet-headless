/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import _ from 'lodash';
import { loggers } from '../utils/logger.util';

/**
 * This plugin is used for testing purposes, storing all events received and allowing their easy
 * retrieval for content and behavior assertion.
 *
 * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/PLUGIN.md
 * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/src/plugins/child.js
 * @see https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/__tests__/integration/plugins/plugin-events.test.js
 */

/** A raw list of all received events for this plugin */
const receivedEvents = [];
/** @type EventEmitter */
let busObject = null;
/** @type function */
let messageListener = null;

/**
 * Mandatory plugin method to initialize it.
 * Receives all events and store them locally.
 * @param {EventEmitter} bus
 * @returns {Promise<void>}
 */
export const init = async bus => {
  busObject = bus;

  messageListener = data => {
    loggers.test?.insertLineToLog(
      `[${receivedEvents.length}] ${data.type} message added`,
      { walletId: data.walletId }
    );
    receivedEvents.push(data);
  };
  busObject.on('message', messageListener);

  loggers.test?.insertLineToLog('plugin[test custom]: loaded');
};

/**
 * Event listener cleanup. Necessary when running on the expected test environment.
 */
export const close = () => {
  busObject.off('message', messageListener);
  busObject = null;
  loggers.test?.insertLineToLog('plugin[test custom]: closed');
};

/**
 * Returns an immutable snapshot of the event history
 * @returns {*[]}
 */
export const retrieveEventHistory = () => _.cloneDeep(receivedEvents);
