/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import AWS from 'aws-sdk';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

import { eventBus } from '../services/notification.service';

export function getSettings() {
  const { argv } = yargs(hideBin(process.argv));

  const region = argv.plugin_sqs_region
  || process.env.HEADLESS_PLUGIN_SQS_REGION
  || null;
  const queueUrl = argv.plugin_sqs_queue_url
  || process.env.HEADLESS_PLUGIN_SQS_QUEUE_URL;
  const endpoint = argv.plugin_sqs_endpoint_url
  || process.env.HEADLESS_PLUGIN_SQS_ENDPOINT_URL
  || null;

  const sqsConfig = { apiVersion: '2012-11-05' };
  if (endpoint !== null) {
    sqsConfig.endpoint = endpoint;
  }
  if (region) {
    sqsConfig.region = region;
  }

  return { region, queueUrl, endpoint, sqsConfig };
}

export function eventHandlerFactory(sqs, settings) {
  return data => {
    const params = {
      QueueUrl: settings.queueUrl,
      MessageBody: JSON.stringify(data),
    };
    sqs.sendMessage(params, err => {
      if (err) {
        console.log(`plugin[sqs] error sending to sqs: ${err}`);
      }
    });
  };
}

/* istanbul ignore next */
export const init = async bus => {
  const settings = getSettings();
  const sqs = new AWS.SQS(settings.sqsConfig);

  bus.on(eventBus, eventHandlerFactory(sqs, settings));

  console.log('plugin[sqs] loaded');
};
