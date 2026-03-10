/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { eventHandler, getSettings } from '../../src/plugins/hathor_debug';
import * as logger from '../../src/logger';

test('settings', () => {
  const oldArgs = process.argv;
  process.argv = [
    'node', // not used but a value is required at this index
    'a_script_file.js', // not used but a value is required at this index
    '--plugin_debug_long',
    'foobar',
  ];
  const settings = getSettings();
  expect(settings).toMatchObject({
    debugLong: 'foobar',
  });

  // Restore original argv state
  process.argv = oldArgs;
});

test('event handler', () => {
  const oldArgs = process.argv;
  const mockLoggerInfo = jest.fn();
  const buildAppLoggerSpy = jest.spyOn(logger, 'buildAppLogger').mockReturnValue({ info: mockLoggerInfo });
  const smallMsg = { type: 'small', walletId: 'default', foo: 'bar' };
  const bigMsg = { type: 'big', walletId: 'default' };
  const bigCompleteMsg = { ...bigMsg, message: '' };
  for (let i = 0; i < 200; i++) {
    // 200 * 'aaaaa'(length of 5) -> lenght of 1000
    bigCompleteMsg.message += 'aaaaa';
  }

  function toDebugMessage(data) {
    return `plugin[debug]: ${data}`;
  }

  // debugLong: off
  process.argv = [
    'node', 'a_script_file.js', // not used but a value is required
    '--plugin_debug_long', 'off',
  ];
  getSettings(); // set debugLong value
  mockLoggerInfo.mockReset();
  // small message: always log
  eventHandler(smallMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(toDebugMessage(JSON.stringify(smallMsg)));
  mockLoggerInfo.mockReset();
  // big message: should not log
  eventHandler(bigCompleteMsg);
  expect(mockLoggerInfo).not.toHaveBeenCalled();

  // debugLong: all
  process.argv = [
    'node', 'a_script_file.js', // not used but a value is required
    '--plugin_debug_long', 'all',
  ];
  getSettings(); // set debugLong value
  mockLoggerInfo.mockReset();
  // small message: always log
  eventHandler(smallMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(toDebugMessage(JSON.stringify(smallMsg)));
  mockLoggerInfo.mockReset();
  // big message: should log the entire message
  eventHandler(bigCompleteMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(
    toDebugMessage(JSON.stringify(bigCompleteMsg))
  );

  // debugLong: unexpected value
  process.argv = [
    'node', 'a_script_file.js', // not used but a value is required
    '--plugin_debug_long', 'any-unexpected-value',
  ];
  getSettings(); // set debugLong value
  mockLoggerInfo.mockReset();
  // small message: always log
  eventHandler(smallMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(toDebugMessage(JSON.stringify(smallMsg)));
  mockLoggerInfo.mockReset();
  // big message: should log partially
  eventHandler(bigCompleteMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(toDebugMessage(JSON.stringify(bigMsg)));

  // debugLong: default (should be the same as unexpected)
  process.argv = [
    'node', 'a_script_file.js', // not used but a value is required
  ];
  getSettings(); // set debugLong value
  mockLoggerInfo.mockReset();
  // small message: always log
  eventHandler(smallMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(toDebugMessage(JSON.stringify(smallMsg)));
  mockLoggerInfo.mockReset();
  // big message: should log partially
  eventHandler(bigCompleteMsg);
  expect(mockLoggerInfo).toHaveBeenCalledWith(toDebugMessage(JSON.stringify(bigMsg)));

  // Restore original argv state
  process.argv = oldArgs;
  buildAppLoggerSpy.mockRestore();
});
