import { HathorWallet } from '@hathor/wallet-lib';

module.exports = {
  friendlyWalletState: {
    [HathorWallet.CLOSED]: 'Closed',
    [HathorWallet.CONNECTING]: 'Connecting',
    [HathorWallet.SYNCING]: 'Syncing',
    [HathorWallet.READY]: 'Ready',
    [HathorWallet.ERROR]: 'Error',
  },

  // Error message when the user tries to send a transaction while the lock is active
  cantSendTxErrorMessage: 'You already have a transaction being sent. Please wait until it\'s done to send another.'
};
