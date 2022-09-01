/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';
import path from 'path';
import config from './config';

/**
 * Get the module path from the plugin name.
 *
 * @param {string} plugname Plugin name
 *
 * @returns {string} Plugin module path
 */
export const getPluginPath = plugname => plugname;

/**
 * Import the plugin from the plugin name
 *
 * @param {string} plugname Plugin name
 *
 * @returns {Promise<unknown>} Module object with exports
 */
export const importPlugin = async plugname => import(getPluginPath(plugname));

/**
 * Import all plugins from the plugins dir.
 *
 * @returns {Promise<unknown>[]} List of module object with exports from plugins.
 */
export const loadPlugins = async () => {
  const pluginDir = config.pluginDir || './src/plugins';

  const files = fs.readdirSync(pluginDir);

  const promises = [];

  // TODO: conditionally import files from config options
  files.forEach(file => {
    const plugname = path.resolve(path.join(pluginDir, file));
    console.log(plugname);
    promises.push(importPlugin(plugname));
  });

  return Promise.all(promises);
};
