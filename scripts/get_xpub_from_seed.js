/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';

function main() {
 /**
  * argv contains the cli arguments that made this script run, including the interpreter
  * and script filename so to get the actual seed passed via cli we need to remove the
  * other arguments.
  * argv = ["babel-node", "get_xpub_from_seed.js", "word0", ..., "wordLast"];
  * We need to remove the first 2 and join the other arguments into a single string
  * separated by spaces
  */
 const seed = process.argv.slice(2).join(' ');
 const hdprivkeyRoot = hathorLib.walletUtils.getXPrivKeyFromSeed(seed);
 // `accountDerivationIndex` will make the util method derive to the change path
 const hdprivkey = hathorLib.walletUtils.deriveXpriv(hdprivkeyRoot, '0\'/0');

 // Print the xpubkey
 console.log(hdprivkey.xpubkey);
}

try {
 main()
 process.exit(0);
} catch(err) {
 console.error(err);
 process.exit(1);
}
