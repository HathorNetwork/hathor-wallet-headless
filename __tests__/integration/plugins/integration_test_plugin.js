/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import fs from 'fs';
import _ from 'lodash';

const receivedEvents = [];

function write(message) {
  fs.appendFile('./tmp/events.txt', `${message}\n`, 'utf8', err => {
    if (err) throw err;
    console.log('Message has been added!');
  });
}

/* istanbul ignore next */
export const init = async bus => {
  write('Plugin was initialized.');

  bus.on('message', data => {
    console.log(`[${data.type}] Message added on ${receivedEvents.length + 1}.`);
    receivedEvents.push(data);

    const timestamp = Date.now();
    const fileInfo = `${timestamp}: ${JSON.stringify(data)}\n`;
    write(fileInfo);
  });

  console.log('plugin[test custom]: loaded');
};

/**
 * Returns an immutable snapshot of the event history
 * @returns {*[]}
 */
export const retrieveEventHistory = () => _.cloneDeep(receivedEvents);
