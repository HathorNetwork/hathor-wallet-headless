/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import amqp from 'amqplib/callback_api';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { eventBus } from '../services/notification.service';

export function getSettings() {
  const { argv } = yargs(hideBin(process.argv));

  const url = argv.plugin_rabbitmq_url
  || process.env.HEADLESS_PLUGIN_RABBITMQ_URL;
  const queue = argv.plugin_rabbitmq_queue
  || process.env.HEADLESS_PLUGIN_RABBITMQ_QUEUE;

  return { url, queue };
}

export function eventHandlerFactory(channel, settings) {
  return data => {
    // channel.assertQueue(queueName, { durable: true });
    // channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), { persistent: true });
    channel.sendToQueue(settings.queue, Buffer.from(JSON.stringify(data)));
  };
}

/* istanbul ignore next */
export const init = async bus => {
  const settings = getSettings();

  amqp.connect(settings.url, (err0, connection) => {
    if (err0) {
      throw err0;
    }
    // Close amqp connection when the process exits
    process.once('exit', connection.close.bind(connection));

    connection.createChannel((err1, channel) => {
      if (err1) {
        throw err1;
      }
      bus.on(eventBus, eventHandlerFactory(channel, settings));
    });
  });

  console.log('plugin[rabbitmq] loaded');
};
