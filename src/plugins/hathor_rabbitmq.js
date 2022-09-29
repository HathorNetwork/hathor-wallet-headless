/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* istanbul ignore next */
async function checkDeps() {
  const requiredDeps = {
    'yargs': '^16.2.0',
    'amqplib': '^0.10.3',
  };
  await Promise.all(requiredDeps.map(async d => {
    try {
      return import(d);
    } catch (e) {
      throw new Error(`Some plugin dependencies are missing, to install them run:
      $ npm install ${Object.entries(requiredDeps).map(d => [d[0], d[1]].join('@')).join(' ') }`);
    }
  }));
}

export function getSettings() {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');
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
  await checkDeps();
  const settings = getSettings();
  const amqp = require('amqplib/callback_api');
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
      bus.on('message', eventHandlerFactory(channel, settings));
    });
  });

  console.log('plugin[rabbitmq] loaded');
};
