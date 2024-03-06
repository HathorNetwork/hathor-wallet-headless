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

export const getSettings = () => {
  const yargs = require('yargs/yargs'); // eslint-disable-line global-require
  const { hideBin } = require('yargs/helpers'); // eslint-disable-line global-require
  const { argv } = yargs(hideBin(process.argv));

  debugLong = argv.plugin_debug_long || process.env.HEADLESS_PLUGIN_DEBUG_LONG;
  return { debugLong };
};

function debugLog(data) {
  console.log(`plugin[debug]: ${data}`);
}

export function eventHandler(data) {
  const message = JSON.stringify(data);
  if (message.length < 1000) {
    debugLog(message);
    return;
  }
  switch (debugLong) {
    case 'off':
      break;
    case 'all':
      debugLog(message);
      break;
    default:
      debugLog(JSON.stringify({
        type: data.type,
        walletId: data.walletId,
      }));
  }
}

/* istanbul ignore next */
export const init = async bus => {
  await checkDeps();
  getSettings();

  bus.on('message', eventHandler);

  console.log('plugin[debug]: loaded');
};
