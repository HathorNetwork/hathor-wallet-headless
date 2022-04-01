const friendlyWalletState = require('../helpers/constants');
const { initializedWallets } = require('../services/wallets.service');
const config = require('../config');

function walletMiddleware(req, res, next) {
  const sendError = (message, state) => {
    res.send({
      success: false,
      message,
      statusCode: state,
      statusMessage: (state ? friendlyWalletState[state] : ''),
    });
  };

  // Get X-WALLET-ID header that defines which wallet the request refers to
  if (!('x-wallet-id' in req.headers)) {
    sendError('Header \'X-Wallet-Id\' is required.');
    return;
  }

  const walletId = req.headers['x-wallet-id'];
  if (!(walletId in initializedWallets)) {
    sendError('Invalid wallet id parameter.');
    return;
  }
  const wallet = initializedWallets[walletId];

  if (config.confirmFirstAddress) {
    const firstAddressHeader = req.headers['x-first-address'];
    const firstAddress = wallet.getAddressAtIndex(0);
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
  next();
}

module.exports = {
  walletMiddleware,
};
