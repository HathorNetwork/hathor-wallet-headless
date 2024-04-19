/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const friendlyWalletState = require('../helpers/constants');
const { initializedWallets, isHsmWallet, hsmWalletIds } = require('../services/wallets.service');
const settings = require('../settings');

async function walletMiddleware(req, res, next) {
  const sendError = (message, state) => {
    res.send({
      success: false,
      message,
      statusCode: state,
      statusMessage: (state ? friendlyWalletState[state] : ''),
    });
  };

  const config = settings.getConfig();

  // Get X-WALLET-ID header that defines which wallet the request refers to
  if (!('x-wallet-id' in req.headers)) {
    sendError('Header \'X-Wallet-Id\' is required.');
    return;
  }

  const walletId = req.headers['x-wallet-id'];
  if (!initializedWallets.has(walletId)) {
    sendError('Invalid wallet id parameter.');
    return;
  }
  const wallet = initializedWallets.get(walletId);

  if (config.confirmFirstAddress) {
    const firstAddressHeader = req.headers['x-first-address'];
    const firstAddress = await wallet.getAddressAtIndex(0);
    if (firstAddress !== firstAddressHeader) {
      sendError(`Wrong first address. This wallet's first address is: ${firstAddress}`);
      return;
    }
  }

  if (!wallet.isReady()) {
    sendError('Wallet is not ready.', wallet.state);
    return;
  }

  // Adding to req parameter, so we don't need to get it in all requests
  req.wallet = wallet;
  req.walletId = walletId;

  if (isHsmWallet(walletId)) {
    req.hsmKeyName = hsmWalletIds.get(walletId);
  }

  next();
}

module.exports = {
  walletMiddleware,
};
