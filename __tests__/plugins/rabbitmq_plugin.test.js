/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { eventHandlerFactory, getSettings } from '../../src/plugins/hathor_rabbitmq';

test('settings', () => {
  const oldArgs = process.argv;
  process.argv = [
    'node', // not used but a value is required at this index
    'a_script_file.js', // not used but a value is required at this index
    '--plugin_rabbitmq_url', 'test-url',
    '--plugin_rabbitmq_queue', 'test-queue',
  ];
  const settings = getSettings();
  expect(settings).toMatchObject({
    url: 'test-url',
    queue: 'test-queue',
  });

  // Restore original argv state
  process.argv = oldArgs;
});

test('event handler', () => {
  const channelMock = {
    sendToQueue: jest.fn(),
  };
  const mockedSettings = { queue: 'test-queue' };
  const evHandler = eventHandlerFactory(channelMock, mockedSettings);
  const data = { test: 'event' };

  evHandler(data);
  expect(channelMock.sendToQueue).toHaveBeenCalledWith('test-queue', Buffer.from(JSON.stringify(data)));
});
