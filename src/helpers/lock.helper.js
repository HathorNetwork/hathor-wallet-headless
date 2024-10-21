/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { lock, lockTypes } = require('../lock');
const { hsmWalletIds } = require('../services/wallets.service');

/**
 * Get the Lock instance for the given walletID.
 * @param {string} walletId
 */
function getWalletLock(walletId) {
  if (hsmWalletIds.has(walletId)) {
    // This is an HSM wallet and the walletLock should be global.
    return lock.hsmLock;
  }
  return lock.get(walletId);
}

/**
 * Acquire the SEND_TX lock for a wallet and return the method to unlock it.
 *
 * @param {string} walletId
 * @return {CallableFunction|null} The function to unlock the SEND_TX lock.
 *
 */
function lockSendTx(walletId) {
  const walletLock = getWalletLock(walletId);

  const canStart = walletLock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    return null;
  }

  let lockReleased = false;
  const unlock = () => {
    if (!lockReleased) {
      lockReleased = true;
      walletLock.unlock(lockTypes.SEND_TX);
    }
  };

  return unlock;
}

module.exports = {
  lockSendTx,
  getWalletLock,
};
