/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* istanbul ignore next */

import { bigIntUtils } from '@hathor/wallet-lib';

async function checkDeps() {
  const requiredDeps = {
    yargs: '^17.7.2',
    amqplib: '^0.10.3',
  };
  await Promise.all(Object.keys(requiredDeps).map(async d => {
    try {
      await import(d);
    } catch (e) {
      throw new Error(`Some plugin dependencies are missing, to install them run:
      $ npm install ${Object.entries(requiredDeps).map(x => [x[0], x[1]].join('@')).join(' ')}`);
    }
  })).catch(e => {
    console.error(e.message);
    process.exit(127);
  });
}

export function getSettings() {
  const yargs = require('yargs/yargs'); // eslint-disable-line global-require
  const { hideBin } = require('yargs/helpers'); // eslint-disable-line global-require
  const { argv } = yargs(hideBin(process.argv));

  const url = argv.plugin_rabbitmq_url
  || process.env.HEADLESS_PLUGIN_RABBITMQ_URL;
  const queue = argv.plugin_rabbitmq_queue
  || process.env.HEADLESS_PLUGIN_RABBITMQ_QUEUE;
  const exchange = argv.plugin_rabbitmq_exchange
  || process.env.HEADLESS_PLUGIN_RABBITMQ_EXCHANGE;
  const routingKey = argv.plugin_rabbitmq_routing_key !== undefined
                      ? argv.plugin_rabbitmq_routing_key
                      : process.env.HEADLESS_PLUGIN_RABBITMQ_ROUTING_KEY;

  if (url === undefined) {
    throw new Error('You must provide a RabbitMQ URL');
  }

  if (queue === undefined && exchange === undefined) {
    throw new Error('You must provide either a RabbitMQ queue or exchange');
  }

  if (queue !== undefined && exchange !== undefined) {
    throw new Error('You must provide either a RabbitMQ queue or exchange, not both');
  }

  if (exchange !== undefined && routingKey === undefined) {
    throw new Error('You must provide a RabbitMQ routing key if you provide exchange. A blank routing key is acceptable though.');
  }

  return { url, queue, exchange, routingKey };
}

export function eventHandlerFactory(channel, settings) {
  if (settings.exchange !== undefined) {
    return data => {
      // Check https://amqp-node.github.io/amqplib/channel_api.html#channel_publish
      channel.publish(
        settings.exchange,
        settings.routingKey,
        Buffer.from(bigIntUtils.JSONBigInt.stringify(data))
      );
    };
  }

  return data => {
    // Check https://amqp-node.github.io/amqplib/channel_api.html#channel_sendToQueue
    channel.sendToQueue(settings.queue, Buffer.from(bigIntUtils.JSONBigInt.stringify(data)));
  };
}

/* istanbul ignore next */
export const init = async bus => {
  await checkDeps();
  const settings = getSettings();
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies,import/no-unresolved
  const amqp = require('amqplib/callback_api');
  amqp.connect(settings.url, (connErr, connection) => {
    if (connErr) {
      throw connErr;
    }
    // Close amqp connection when the process exits
    process.once('exit', connection.close.bind(connection));

    connection.createChannel((channelErr, channel) => {
      if (channelErr) {
        throw channelErr;
      }
      bus.on('message', eventHandlerFactory(channel, settings));
    });
  });

  console.log('plugin[rabbitmq] loaded');
};
