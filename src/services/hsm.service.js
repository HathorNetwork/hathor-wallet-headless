/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { hsm } = require('@dinamonetworks/hsm-dinamo');
const { getConfig } = require('../settings');

/**
 * HSM connection object to be used throughout the application
 * @type {hsm}
 */
let globalConnectionObj = null;

async function hsmConnect() {
  if (globalConnectionObj) {
    return globalConnectionObj;
  }

  // Gets the connection data from the global config file
  const { hsmConnectionOptions } = getConfig();

  // Connects to HSM
  globalConnectionObj = await hsm.connect(hsmConnectionOptions);
  console.log('HSM connected.');

  return globalConnectionObj;
}

async function hsmDisconnect() {
  if (globalConnectionObj) {
    await globalConnectionObj.disconnect();
    globalConnectionObj = null;
  }
}

module.exports = {
  hsmConnect,
  hsmDisconnect,
};
