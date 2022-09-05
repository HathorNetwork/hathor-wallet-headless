/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import config from './config';

const hathorPlugins = {
  debug: {
    name: 'debug',
    file: 'hathor_debug.js',
  },
  ws: {
    name: 'websocket',
    file: 'hathor_websocket.js',
  },
};

/**
 * Get the module path from the plugin filename.
 *
 * @param {string} pluginFile Plugin file name
 *
 * @returns {string} Plugin module path
 */
export const getPluginPath = pluginFile => {
  const pluginDir = config.pluginDir || './src/plugins';
  return path.resolve(path.join(pluginDir, pluginFile));
};

/**
 * Find and import a plugin returning the exported methods.
 *
 * @param {Object} pluginConfig Plugin configuration
 *
 * @returns {Promise<unknown>} Module object with the exported methods
 */
export const importPlugin = async pluginConfig => {
  const filename = getPluginPath(pluginConfig.file);

  return import(filename);
};

/**
 * Import all configured plugins and return the module objects.
 *
 * @returns {Promise<unknown>[]} Array of plugin modules.
 */
export const loadPlugins = async () => {
  const promises = [];
  const enabledPlugins = config.enabled_plugins || [];
  const customPlugins = config.plugin_config || {};

  for (const pluginId of enabledPlugins) {
    const pluginConfig = hathorPlugins[pluginId] || customPlugins[pluginId];
    if (!pluginConfig) {
      console.log(`Unable to find plugin ${pluginId}, skipping.`);
      continue;
    }
    promises.push(importPlugin(pluginConfig));
  }

  return Promise.all(promises);
};
