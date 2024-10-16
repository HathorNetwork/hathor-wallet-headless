/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { lock, lockTypes } = require('../lock');

/**
 * Acquire the SEND_TX lock for a wallet and return the method to unlock it.
 *
 * @param {string} walletId
 * @return {CallableFunction|null} The function to unlock the SEND_TX lock.
 *
 */
function lockSendTx(walletId) {
  const walletLock = lock.get(walletId);
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
};
