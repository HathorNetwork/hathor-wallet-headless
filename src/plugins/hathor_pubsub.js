/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* istanbul ignore next */
async function checkDeps() {
  const requiredDeps = {
    '@google-cloud/pubsub': '^4.0.1',
    yargs: '^16.2.0',
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

  const projectId = argv.plugin_pubsub_project || process.env.HEADLESS_PLUGIN_PUBSUB_PROJECT;
  const topicName = argv.plugin_pubsub_topic_name
  || process.env.HEADLESS_PLUGIN_PUBSUB_TOPIC_NAME || null;

  const pubsubConfig = { apiVersion: '2012-11-05', projectId, topicName };

  return pubsubConfig;
}

export function eventHandlerFactory(topic) {
  return message => {
    console.log(message);
    topic.publishMessage({ json: message }, err => {
      if (err) {
        console.log(`plugin[pubsub] error sending to pubsub: ${err}`);
      }
    });
  };
}

/* istanbul ignore next */
export const init = async bus => {
  await checkDeps();
  const settings = getSettings();
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies,import/no-unresolved
  const { PubSub } = require('@google-cloud/pubsub');
  const { projectId } = settings;
  console.log(projectId);
  const pubsub = new PubSub({ projectId });
  const [topics] = await pubsub.getTopics();
  let topic = topics
    .find(t => t.name === `projects/${settings.projectId}/topics/${settings.topicName}`);

  if (!topic) {
    pubsub.createTopic(settings.topicName, (err, newTopic, apiResponse) => {
      if (err) {
        console.error(`plugin[pubsub] unable to create topic: ${err}`);
        return;
      }
      topic = newTopic;
      console.info(apiResponse);
    });
  }

  bus.on('message', eventHandlerFactory(topic));
  console.log('plugin[pubsub] loaded');
};
