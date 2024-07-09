/* eslint-disable max-classes-per-file */
/*
 * Lock mutex class singleton to handle memory locks
 * The lock is local and only works with one thread and no balance between multiple instances.
 * In those cases, we would need to add support for a distributed lock (e.g. using redis).
 */

// Lock types enum
// SENDING_TX is used to lock when a tx is being sent
// HSM is used to lock when there is a connection already open with the HSM
// We don't support sending multiples transactions concurrently
// so we use this to prevent a user from sending multiples requests
// while the first was not finished
export const lockTypes = {
  SEND_TX: 0,
  HSM: 1,
};

// Default timeout to unlock the status
const DEFAULT_UNLOCK_TIMEOUT = 2 * 60 * 1000; // 2 minutes

class Lock {
  constructor() {
    // Stores the lock status for each option in enum
    this.lockStatus = {};

    // Variable to store the setTimeout return for each lock status
    this.setTimeoutLock = {};

    // Initializing the objects above with default value for each lock type
    for (const type in lockTypes) {
      this.lockStatus[type] = false;
      this.setTimeoutLock[type] = null;
    }
  }

  // Set lock status to false and clear the setTimeout
  // this method is called when the lock action is finished and we can release the lock
  unlock(type) {
    this.lockStatus[type] = false;
    if (this.setTimeoutLock[type]) {
      clearTimeout(this.setTimeoutLock[type]);
      this.setTimeoutLock[type] = null;
    }
  }

  // Starts a lock
  // If it's already locked, we return false, which means that someone
  // has already requested this lock and was not released yet
  // Otherwise we set the lockStatus = true, clear any old setTimeout variable
  // and create a new setTimeout to clean this lockStatus for extra protection in case of a problem
  lock(type, timeout = DEFAULT_UNLOCK_TIMEOUT) {
    if (this.lockStatus[type]) {
      return false;
    }

    this.lockStatus[type] = true;

    if (this.setTimeoutLock[type]) {
      clearTimeout(this.setTimeoutLock[type]);
      this.setTimeoutLock[type] = null;
    }

    this.setTimeoutLock[type] = setTimeout(() => {
      this.unlock(type);
    }, timeout);

    return true;
  }
}

class GlobalLock {
  constructor() {
    // A wallet registry where the keys are the wallet-ids and the values
    // are an instance of Lock, this works as a per-wallet lock mechanism.
    /** @type {Object.<string, Lock>} */
    this.wallets = {};
    // This is the global lock since some methods are required to be
    // running only once across all wallets.
    this.globalLock = new Lock();
  }

  delete(walletId) {
    if (this.wallets[walletId]) {
      delete this.wallets[walletId];
    }
  }

  get(walletId) {
    if (!this.wallets[walletId]) {
      this.wallets[walletId] = new Lock();
    }
    return this.wallets[walletId];
  }

  // The `lock` and `unlock` methods work as a global wallet lock
  // for methods that should lock between multiple wallets

  lock(type, timeout = DEFAULT_UNLOCK_TIMEOUT) {
    return this.globalLock.lock(type, timeout);
  }

  unlock(type) {
    this.globalLock.unlock(type);
  }
}

export const lock = new GlobalLock();
