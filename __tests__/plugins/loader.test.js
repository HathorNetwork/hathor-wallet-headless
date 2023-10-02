/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import { getPluginPath, importPlugin, loadPlugins, main } from '../../src/plugins/child';
import settings from '../../src/settings';

beforeAll(() => {
  jest.mock(getPluginPath('hathor_websocket.js'), () => ({ init: jest.fn() }));
});

test('getPluginPath', () => {
  expect(getPluginPath('a.js')).toEqual(path.resolve('./src/plugins/a.js'));
});

test('importPlugin', async () => {
  jest.mock(getPluginPath('pluginA.js'), () => 'pluginModule', { virtual: true });
  const plugin = await importPlugin({ file: 'pluginA.js' });
  expect(plugin).toEqual({ default: 'pluginModule' });
});

test('loadPlugins', async () => {
  jest.mock(getPluginPath('custom_plugin.js'), () => 'customModule', { virtual: true });
  const customConfig = {
    custom: { file: 'custom_plugin.js' },
  };
  const mockedCustom = await import(getPluginPath('custom_plugin.js'));
  const mockedWs = await import(getPluginPath('hathor_websocket.js'));
  expect(await loadPlugins(['ws', 'custom'], customConfig)).toEqual([mockedWs, mockedCustom]);
  // Skip plugins without configuration
  expect(await loadPlugins(['ws', 'custom', 'nonExistantPlugin'], customConfig)).toEqual([mockedWs, mockedCustom]);
});

test('main', async () => {
  jest.mock(getPluginPath('custom_pluginA.js'), () => ({ init: jest.fn() }), { virtual: true });
  const config = settings.getConfig();
  config.enabled_plugins = ['ws', 'custom'];
  config.plugin_config = {
    custom: { file: 'custom_pluginA.js' },
  };
  settings._setConfig(config);
  await main();
  const wsMocked = await import(getPluginPath('hathor_websocket.js'));
  const customMocked = await import(getPluginPath('custom_pluginA.js'));
  expect(customMocked.init).toHaveBeenCalled();
  expect(wsMocked.init).toHaveBeenCalled();
});
