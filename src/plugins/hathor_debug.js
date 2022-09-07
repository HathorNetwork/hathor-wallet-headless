/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { eventBus } from '../services/notification.service';

let debugLong;

export const getSettings = () => {
  const { argv } = yargs(hideBin(process.argv));

  debugLong = argv.plugin_debug_long || process.env.HEADLESS_PLUGIN_DEBUG_LONG;
  return { debugLong };
};

export function eventHandler(data) {
  const message = JSON.stringify(data);
  if (message.length > 1000) {
    switch (debugLong) {
      case 'off':
        break;
      case 'all':
        console.log(message);
        break;
      default:
        console.log(JSON.stringify({
          type: data.type,
          walletId: data.walletId,
        }));
    }
  } else {
    console.log(message);
  }
}

/* istanbul ignore next */
export const init = async bus => {
  getSettings();

  bus.on(eventBus, eventHandler);

  console.log('plugin[debug]: loaded');
};
