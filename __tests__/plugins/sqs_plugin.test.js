/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { bigIntUtils } from '@hathor/wallet-lib';
import { eventHandlerFactory, getSettings } from '../../src/plugins/hathor_sqs';

test('settings', () => {
  const oldArgs = process.argv;
  process.argv = [
    'node', // not used but a value is required at this index
    'a_script_file.js', // not used but a value is required at this index
    '--plugin_sqs_region', 'test-region',
    '--plugin_sqs_queue_url', 'test-url',
    '--plugin_sqs_endpoint_url', 'test-endpoint',
  ];
  let settings = getSettings();
  expect(settings).toMatchObject({
    queueUrl: 'test-url',
    sqsConfig: {
      apiVersion: '2012-11-05',
      region: 'test-region',
      endpoint: 'test-endpoint',
    },
  });

  process.argv = [
    'node', // not used but a value is required at this index
    'a_script_file.js', // not used but a value is required at this index
    '--plugin_sqs_queue_url', 'test-url',
  ];
  settings = getSettings();
  expect(settings).toMatchObject({
    queueUrl: 'test-url',
    sqsConfig: { apiVersion: '2012-11-05' },
  });

  // Restore original argv state
  process.argv = oldArgs;
});

test('event handler', () => {
  const sqsMock = {
    sendMessage: jest.fn(),
  };
  const mockedSettings = { queueUrl: 'test-queue' };
  const evHandler = eventHandlerFactory(sqsMock, mockedSettings);
  const data = { test: 'event', bigInt: BigInt(Number.MAX_SAFE_INTEGER) + 1n };

  evHandler(data);
  expect(sqsMock.sendMessage).toHaveBeenCalledWith({
    QueueUrl: mockedSettings.queueUrl,
    MessageBody: bigIntUtils.JSONBigInt.stringify(data),
  }, expect.anything());
});

test('event handler logs error on SQS failure', () => {
  const mockError = jest.fn();
  // eslint-disable-next-line global-require
  const loggerModule = require('../../src/logger');
  jest.spyOn(loggerModule, 'buildAppLogger').mockReturnValue({ error: mockError });

  const sqsMock = {
    sendMessage: jest.fn((params, cb) => cb(new Error('SQS send failed'))),
  };
  const mockedSettings = { queueUrl: 'test-queue' };
  const evHandler = eventHandlerFactory(sqsMock, mockedSettings);

  evHandler({ test: 'event' });

  expect(mockError).toHaveBeenCalledWith(
    expect.stringContaining('plugin[sqs] error sending to sqs:')
  );
});
