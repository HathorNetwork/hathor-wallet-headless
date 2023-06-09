/* eslint-disable max-classes-per-file */

/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Represents errors related to interactions with the Atomic Swap Service
 */
class SwapServiceError extends Error {}

/**
 * Represents errors related to a Wallet initialization
 */
class WalletStartError extends Error {}

module.exports = {
  SwapServiceError,
  WalletStartError,
};
