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
 * Represents errors related to invalid or incorrect data stored on the HSM
 */
class HsmError extends Error {}

/**
 * Represents errors related to a Wallet initialization
 */
class WalletStartError extends Error {}

/**
 * When reloading the config, if we change a key that makes the state non-recoverable
 * this error is thrown.
 */
class NonRecoverableConfigChangeError extends Error {}

/**
 * This error is thrown when trying to read the configuration but it is currently on reload.
 */
class UnavailableConfigError extends Error {}

module.exports = {
  SwapServiceError,
  HsmError,
  WalletStartError,
  NonRecoverableConfigChangeError,
  UnavailableConfigError,
};
