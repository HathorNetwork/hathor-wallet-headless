/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import settings from '../settings';

import { notificationBus, EVENTBUS_EVENT_NAME } from '../services/notification.service';

/**
 * @typedef {Object} Plugin
 * @property {Function} init
 * @property {Function} [destroy]
 */

/**
 * @typedef {Object} PluginConfig
 * @property {string} name Plugin name
 * @property {string} file Plugin filename inside the plugin directory.
 */

/**
 * Hathor plugins
 * @type {Record<string, PluginConfig>}
 */
export const hathorPlugins = {
  debug: {
    name: 'debug',
    file: 'hathor_debug.js',
  },
  ws: {
    name: 'websocket',
    file: 'hathor_websocket.js',
  },
  sqs: {
    name: 'sqs',
    file: 'hathor_sqs.js',
  },
  rabbitmq: {
    name: 'rabbitmq',
    file: 'hathor_rabbitmq.js',
  },
};

/**
 * Get the module path from the plugin filename.
 *
 * @param {string} pluginFile Plugin file name
 *
 * @returns {string} Plugin module path
 */
export const getPluginPath = pluginFile => path.resolve(path.join(__dirname, pluginFile));

/**
 * Find and import a plugin returning the exported methods.
 *
 * @param {PluginConfig} pluginConfig Plugin configuration
 *
 * @returns {Promise<Plugin>} Module object with the exported methods
 */
export const importPlugin = async pluginConfig => {
  const filename = getPluginPath(pluginConfig.file);

  return import(filename);
};

/**
 * Import all plugins and return the module objects.
 *
 * @param {string[]} enabled List of enabled plugins to import.
 * @param {Record<string, PluginConfig>} customConfig Custom plugin configuration.
 *
 * @returns {Promise<Plugin[]>} Array of plugin modules.
 */
export const loadPlugins = async (enabled, customConfig) => {
  const promises = [];
  /**
   * @type {string[]}
   */
  const enabledPlugins = enabled || [];
  /**
   * @type {Record<string, PluginConfig>}
   */
  const customPlugins = customConfig || {};

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

export const main = async () => {
  await settings.setupConfig();
  const config = settings.getConfig();
  const plugins = await loadPlugins(config.enabled_plugins, config.plugin_config);

  // Start plugins

  for (const plugin of plugins) {
    /**
     * Startup of each plugin will be async
     * because some may require awaiting external services.
     */
    await plugin.init(notificationBus);
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('disconnect', () => {
    // If parent disconnects, we must exit to avoid running indefinetly
    console.log('[child_process] parent disconnected');
    process.exit(127);
  });

  process.on('message', data => {
    // Repeat notifications from main process to local notification service
    notificationBus.emit(EVENTBUS_EVENT_NAME, data);
    if (data.type) {
      notificationBus.emit(data.type, data);
    }
  });

  console.log('[child_process] startup');
  main();
}
