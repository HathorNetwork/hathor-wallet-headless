/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { bigIntUtils } from '@hathor/wallet-lib';
import { eventHandlerFactory, getSettings } from '../../src/plugins/hathor_rabbitmq';

describe('RabbitMQ plugin settings', () => {
  it('should throw an error if no settings are provided', () => {
    const oldArgs = process.argv;
    process.argv = [
      'node', // not used but a value is required at this index
      'a_script_file.js', // not used but a value is required at this index
    ];
    expect(() => getSettings()).toThrow('You must provide a RabbitMQ URL');
    process.argv = oldArgs;
  });

  it('should throw an error if no queue or exchange is provided', () => {
    const oldArgs = process.argv;
    process.argv = [
      'node', // not used but a value is required at this index
      'a_script_file.js', // not used but a value is required at this index
      '--plugin_rabbitmq_url', 'test-url',
    ];
    expect(() => getSettings()).toThrow('You must provide either a RabbitMQ queue or exchange');
    process.argv = oldArgs;
  });

  it('should throw an error if both queue and exchange are provided', () => {
    const oldArgs = process.argv;
    process.argv = [
      'node', // not used but a value is required at this index
      'a_script_file.js', // not used but a value is required at this index
      '--plugin_rabbitmq_url', 'test-url',
      '--plugin_rabbitmq_queue', 'test-queue',
      '--plugin_rabbitmq_exchange', 'test-exchange',
    ];
    expect(() => getSettings()).toThrow('You must provide either a RabbitMQ queue or exchange, not both');
    process.argv = oldArgs;
  });

  it('should throw an error if exchange is provided without routing key', () => {
    const oldArgs = process.argv;
    process.argv = [
      'node', // not used but a value is required at this index
      'a_script_file.js', // not used but a value is required at this index
      '--plugin_rabbitmq_url', 'test-url',
      '--plugin_rabbitmq_exchange', 'test-exchange',
    ];
    expect(() => getSettings()).toThrow('You must provide a RabbitMQ routing key if you provide exchange. A blank routing key is acceptable though.');
    process.argv = oldArgs;
  });

  it('should return the settings if everything is correct with queue configuration', () => {
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
    process.argv = oldArgs;
  });

  it('should return the settings if everything is correct with exchange and routing key', () => {
    const oldArgs = process.argv;
    process.argv = [
      'node', // not used but a value is required at this index
      'a_script_file.js', // not used but a value is required at this index
      '--plugin_rabbitmq_url', 'test-url',
      '--plugin_rabbitmq_exchange', 'test-exchange',
      '--plugin_rabbitmq_routing_key', 'test-routing-key',
    ];
    const settings = getSettings();
    expect(settings).toMatchObject({
      url: 'test-url',
      exchange: 'test-exchange',
      routingKey: 'test-routing-key',
    });
    process.argv = oldArgs;
  });

  it('should return the settings if everything is correct with exchange and a blank routing key', () => {
    const oldArgs = process.argv;
    process.argv = [
      'node', // not used but a value is required at this index
      'a_script_file.js', // not used but a value is required at this index
      '--plugin_rabbitmq_url', 'test-url',
      '--plugin_rabbitmq_exchange', 'test-exchange',
      '--plugin_rabbitmq_routing_key', '',
    ];
    const settings = getSettings();
    expect(settings).toMatchObject({
      url: 'test-url',
      exchange: 'test-exchange',
      routingKey: '',
    });
    process.argv = oldArgs;
  });
});

describe('RabbitMQ plugin event handler', () => {
  it('should return a function that sends to a queue', () => {
    const channelMock = {
      sendToQueue: jest.fn(),
    };
    const mockedSettings = { queue: 'test-queue' };
    const evHandler = eventHandlerFactory(channelMock, mockedSettings);
    const data = { test: 'event' };

    evHandler(data);
    expect(channelMock.sendToQueue).toHaveBeenCalledWith('test-queue', Buffer.from(bigIntUtils.JSONBigInt.stringify(data)));
  });

  it('should return a function that publishes to an exchange', () => {
    const channelMock = {
      publish: jest.fn(),
    };
    const mockedSettings = { exchange: 'test-exchange', routingKey: 'test-routing-key' };
    const evHandler = eventHandlerFactory(channelMock, mockedSettings);
    const data = { test: 'event' };

    evHandler(data);
    expect(channelMock.publish).toHaveBeenCalledWith('test-exchange', 'test-routing-key', Buffer.from(bigIntUtils.JSONBigInt.stringify(data)));
  });
});
