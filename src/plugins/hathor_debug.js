/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
let debugLong;

/* istanbul ignore next */
async function checkDeps() {
  const requiredDeps = {
    'yargs': '^16.2.0',
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

export const getSettings = () => {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');
  const { argv } = yargs(hideBin(process.argv));

  debugLong = argv.plugin_debug_long || process.env.HEADLESS_PLUGIN_DEBUG_LONG;
  return { debugLong };
};

export function eventHandler(data) {
  const message = JSON.stringify(data);
  if (message.length > 1000) {
    switch (debugLong) {
      case 'off':
        break;
      case 'all':
        console.log(message);
        break;
      default:
        console.log(JSON.stringify({
          type: data.type,
          walletId: data.walletId,
        }));
    }
  } else {
    console.log(message);
  }
}

/* istanbul ignore next */
export const init = async bus => {
  await checkDeps();
  getSettings();

  bus.on('message', eventHandler);

  console.log('plugin[debug]: loaded');
};
