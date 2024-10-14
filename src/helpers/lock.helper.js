/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { lock, lockTypes } = require('../lock');
const { cantSendTxErrorMessage } = require('./constants');

/**
 * Acquire the SEND_TX lock for a wallet and return the method to unlock it.
 *
 * @param {string} walletId
 * @return {[CallableFunction, string|null]} The unlock function and the error message.
 *
 */
function lockSendTx(walletId) {
  const walletLock = lock.get(walletId);
  const canStart = walletLock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    return [() => null, cantSendTxErrorMessage];
  }

  let lockReleased = false;
  const unlock = () => {
    if (!lockReleased) {
      lockReleased = true;
      walletLock.unlock(lockTypes.SEND_TX);
    }
  };

  return [unlock, null];
}

module.exports = {
  lockSendTx,
};
