/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getSockets, eventHandler, connectionHandler, getSettings } from '../../src/plugins/hathor_websocket';

test('settings', () => {
  const oldArgs = process.argv;
  process.argv = [
    'node', // not used but a value is required at this index
    'a_script_file.js', // not used but a value is required at this index
    '--plugin_ws_port', 123,
  ];
  const settings = getSettings();
  expect(settings).toMatchObject({
    port: 123,
  });

  // Restore original argv state
  process.argv = oldArgs;
});

test('connection handler', () => {
  const socket = {
    on: jest.fn().mockImplementation((ev, cb) => {
      socket.cb = cb;
    }),
  };

  connectionHandler(socket);
  expect(socket.on).toHaveBeenCalled();
  expect(getSockets()).toEqual([socket]);
  // Simulate close event
  socket.cb();
  expect(getSockets()).toEqual([]);
});

test('event handler', () => {
  const socket1 = {
    on: jest.fn().mockImplementation((ev, cb) => {
      socket1.cb = cb;
    }),
    send: jest.fn(),
  };
  const socket2 = {
    on: jest.fn().mockImplementation((ev, cb) => {
      socket2.cb = cb;
    }),
    send: jest.fn(),
  };
  // Simulate connections
  connectionHandler(socket1);
  connectionHandler(socket2);

  eventHandler({ foo: 'bar' });
  expect(socket1.send).toHaveBeenCalledWith('{"foo":"bar"}');
  expect(socket2.send).toHaveBeenCalledWith('{"foo":"bar"}');

  // simulate disconnections
  socket1.cb();
  socket2.cb();
});
