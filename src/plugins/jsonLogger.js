/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { eventBusName, notificationBus } from '../services/notification.service';

export const init = async (server, app) => {
  notificationBus.on(eventBusName, data => {
    const message = JSON.stringify(data);
    switch (data.type) {
      case 'wallet:state':
      case 'wallet:new-tx':
      case 'wallet:update-tx':
        // Always log wallet events
        console.log(message);
        break;
      default:
        if (message.length < 1000) {
          // Only log short messages
          console.log(message);
        }
    }
  });

  console.log('JSON LOGGER PLUGIN LOADED!');
};
