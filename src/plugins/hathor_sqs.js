/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* istanbul ignore next */
async function checkDeps() {
  const requiredDeps = {
    'aws-sdk': '^2.1226.0',
    yargs: '^17.7.2',
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

  return { queueUrl, sqsConfig };
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
  await checkDeps();
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies,import/no-unresolved
  const AWS = require('aws-sdk');
  const settings = getSettings();
  const sqs = new AWS.SQS(settings.sqsConfig);

  bus.on('message', eventHandlerFactory(sqs, settings));

  console.log('plugin[sqs] loaded');
};
