/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const _ = require('lodash');

let _config = null;
let started = false;
const configPath = './testconfig.js';

async function _importConfig() {
  return (await import(configPath)).default;
}

function get_config() {
  if (_config) {
    return _config;
  }
  throw new Error('Configuration cannot be read rn');
}

async function reload_config() {
  const oldConfig = _.cloneDeep(_config);
  /**
   * *** IMPORTANT ***
   * This will delete the cached config from nodejs cache system
   * The next import will read from the file once again.
   */
  delete require.cache[require.resolve(configPath)];
  const newConfig = await _importConfig();

  // Checks
  if (oldConfig.foo !== newConfig.foo) {
    console.log("The FOO has changed!!!");
  }

  // All checks have passed, settings the singleton
  _config = newConfig;
}

async function setup_config() {
  if (started) {
    throw new Error('Should not reimport the config without a reload');
  }

  _config = await _importConfig();
  started = true;
}

module.exports = {
  get_config,
  reload_config,
  setup_config,
};
