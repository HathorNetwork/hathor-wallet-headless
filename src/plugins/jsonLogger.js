/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { eventBusName } from '../services/notification.service';

export const init = async (bus, app) => {
  bus.on(eventBusName, data => {
    console.log(JSON.stringify(data));
  });

  console.log('JSON LOGGER PLUGIN LOADED!');
};
