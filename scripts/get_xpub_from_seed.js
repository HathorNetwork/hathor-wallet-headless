/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { argv } from 'node:process';
import hathorLib from '@hathor/wallet-lib';
import { HDPublicKey } from 'bitcore-lib';

/**
 * argv contains the cli arguments that made this script run, including the interpreter and script filename
 * So to get the actual seed passed via cli we need to remove the other arguments.
 * argv = ["babel-node", "get_xpub_from_seed.js", "word0", ..., "wordLast"];
 * We need to remove the first 2 and join the other arguments into a single string separated by spaces
 */
const seed = argv.slice(2).join(' ');
// `accountDerivationIndex` will make the util method derive to the change path
const xpubkey = hathorLib.walletUtils.getXPubKeyFromSeed(seed, { accountDerivationIndex: '0\'/0' });
const hdpubkey = HDPublicKey.fromString(xpubkey);

// Print the xpubkey
console.log(hdpubkey.toString());