/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { walletUtils } from '@hathor/wallet-lib';

function main() {
  const words = walletUtils.generateWalletWords();

  console.log(words);
}

try {
  main();
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
