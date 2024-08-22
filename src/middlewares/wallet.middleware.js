/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const friendlyWalletState = require('../helpers/constants');
const { initializedWallets, isHsmWallet, hsmWalletIds } = require('../services/wallets.service');
const settings = require('../settings');
import { HathorWallet } from '@hathor/wallet-lib';
import {Request, Response, NextFunction} from 'express';

/**
 * Extracts wallet from initializedWallets based on the X-Wallet-ID header and
 * validates the call, if valid, injects the wallet instance in the request
 * instance and proceed with the call stack.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 *
 */
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

  // Does not require `/wallet` prefix since this is being routed in the walletRouter.
  // Matches `/stop` and `/stop/` since both are valid.
  if (/^\/stop\/?$/.test(req.path)) {
    // A special case for `/wallet/stop` is when
    if (!(wallet.isReady() || wallet.state === HathorWallet.ERROR)) {
      sendError('Wallet needs to be ready or unrecoverable to be stopped.', wallet.state);
      return;
    }
  } else {
    if (!wallet.isReady()) {
      sendError('Wallet is not ready.', wallet.state);
      return;
    }
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
