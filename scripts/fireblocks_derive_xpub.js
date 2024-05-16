/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const hathorlib = require('@hathor/wallet-lib');

(async () => {
  // Main
  if (process.argv.length < 3) {
    console.log('Usage: node scripts/fireblocks_derive_xpub.js <rootXpub>');
    process.exit(1);
  }
  let xpubkey = process.argv[2];
  xpubkey = hathorlib.walletUtils.xpubDeriveChild(xpubkey, 44);
  xpubkey = hathorlib.walletUtils.xpubDeriveChild(xpubkey, 280);
  xpubkey = hathorlib.walletUtils.xpubDeriveChild(xpubkey, 0);

  console.log(`Account path xPub: ${xpubkey.toString()}`);
})()
  .then(() => process.exit(0))
  .catch(async err => {
    console.error(err);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise(resolve => setTimeout(resolve, 50));
    process.exit(1);
  });
