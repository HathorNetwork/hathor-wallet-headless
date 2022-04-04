/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  /**
   * MultiSig is a P2SH method to have joint ownership of a wallet among participants.
   *
   * == IMPORTANT ==
   * The wallet-headless has multisig capabilities but due to an error on the Hathor wallet-lib
   * The error makes the P2SH addresses to be misinterpreted as P2PKH.
   * Funds are lost when sending to a P2SH address using the wallet-lib with this error.
   * Support for P2SH addresses is added on wallet-lib v0.33.1 but wallets could still use the old wallet-lib versions.
   * Safe wallet versions (wallets using wallet-lib 0.33.1):
   * - Desktop  : v0.22.1
   * - Mobile   : v0.17.1
   * - Headless : v0.11.1
   *
   * == WARNING ==
   * It is currently UNSAFE to turn this feature on.
   * Do NOT enable this unless you know what you're doing.
   */
  MULTISIG_ENABLED: false,
}
