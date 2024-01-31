/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// eslint-disable-next-line import/no-import-module-exports
import { HathorWallet } from '@hathor/wallet-lib';

const API_ERROR_CODES = Object.freeze({
  WALLET_ALREADY_STARTED: 'WALLET_ALREADY_STARTED'
});

module.exports = {
  friendlyWalletState: {
    [HathorWallet.CLOSED]: 'Closed',
    [HathorWallet.CONNECTING]: 'Connecting',
    [HathorWallet.SYNCING]: 'Syncing',
    [HathorWallet.READY]: 'Ready',
    [HathorWallet.ERROR]: 'Error',
    [HathorWallet.PROCESSING]: 'Processing',
  },

  // Error message when the user tries to send a transaction while the lock is active
  cantSendTxErrorMessage: 'You already have a transaction being sent. Please wait until it\'s done to send another.',
  hsmBusyErrorMessage: 'You already have a connection open with the HSM. Please wait until it\'s closed to try again.',
  API_ERROR_CODES,
};
