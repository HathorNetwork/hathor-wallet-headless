/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { HDPublicKey } = require('bitcore-lib');

(async () => {
  // Main
  if (process.argv.length < 3) {
    console.log('Usage: node scripts/fireblocks_derive_xpub.js <rootXpub>');
    process.exit(1);
  }
  const rootXpub = process.argv[2];
  const rootHDPubKey = new HDPublicKey(rootXpub);
  const accountHdPubkey = rootHDPubKey.derive('m/44/280/0');

  console.log(`Account path xPub: ${accountHdPubkey.toString()}`);
})()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
