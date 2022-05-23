/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { wallet } from '@hathor/wallet-lib';

const words = wallet.generateWalletWords();

console.log(words);
