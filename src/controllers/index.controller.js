/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { walletApi, tokensUtils, walletUtils, Connection, HathorWallet, Network, helpersUtils, SendTransaction } = require('@hathor/wallet-lib');
const apiDocs = require('../api-docs');
const config = require('../config');
const { initializedWallets } = require('../services/wallets.service');
const { notificationBus } = require('../services/notification.service');
const { cantSendTxErrorMessage, API_ERROR_CODES } = require('../helpers/constants');
const { parametersValidation } = require('../helpers/validations.helper');
const { sanitizeLogInput } = require('../logger');
const { getReadonlyWalletConfig, getWalletConfigFromSeed, WalletStartError } = require('../helpers/wallet.helper');
const { mapTxReturn } = require('../helpers/tx.helper');
const { lock, lockTypes } = require('../lock');

function welcome(req, res) {
  res.send('<html><body><h1>Welcome to Hathor Wallet API!</h1>'
           + '<p>See the <a href="docs/">docs</a></p></body></html>');
}

function docs(req, res) {
  res.send(apiDocs);
}

async function start(req, res) {
  // We expect the user to either send the seed or an xpubkey he wants to use.
  if (!('xpubkey' in req.body) && !('seedKey' in req.body) && !('seed' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'seedKey\', \'seed\' or \'xpubkey\' is required.',
    });
    return;
  }

  if (('seedKey' in req.body) && ('seed' in req.body)) {
    res.send({
      success: false,
      message: 'You can\'t have both \'seedKey\' and \'seed\' in the body.',
    });
    return;
  }

  if ((('seedKey' in req.body) || ('seed' in req.body)) && ('xpubkey' in req.body)) {
    res.send({
      success: false,
      message: 'You can\'t start a readonly wallet and send a seed in the same request.',
    });
    return;
  }

  // The user must send a key to index this wallet
  if (!('wallet-id' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'wallet-id\' is required.',
    });
    return;
  }

  const walletID = req.body['wallet-id'];
  if (initializedWallets.has(walletID)) {
    // We already have a wallet for this key
    // so we log that it won't start a new one because
    // it must first stop the old wallet and then start the new
    console.error('Error starting wallet because this wallet-id is already in use. You must stop the wallet first.');
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletID}`,
      errorCode: API_ERROR_CODES.WALLET_ALREADY_STARTED,
    });
    return;
  }

  let multisigData = null;
  if (('multisig' in req.body) && (req.body.multisig !== false)) {
    const multisigKey = req.body.seedKey || req.body.multisigKey;

    if (!(config.multisig && (multisigKey in config.multisig))) {
      // Trying to start a multisig without proper configuration
      res.send({
        success: false,
        message: `${multisigKey} is not configured for multisig.`
      });
      return;
    }
    // validate multisig configuration:
    //   (i) Should have all fields
    //  (ii) `pubkeys` length should match `total`
    // (iii) `numSignatures` should be less or equal to `total`
    const mconfig = config.multisig[multisigKey];
    if (!(mconfig
           && (mconfig.total && mconfig.numSignatures && mconfig.pubkeys)
           && (mconfig.pubkeys.length === mconfig.total)
           && (mconfig.numSignatures <= mconfig.total))) {
      // Missing multisig items
      res.send({
        success: false,
        message: `Improperly configured multisig for seed ${multisigKey}.`
      });
      return;
    }
    multisigData = {
      numSignatures: mconfig.numSignatures,
      pubkeys: mconfig.pubkeys,
    };
    console.log(`Starting multisig wallet with ${multisigData.pubkeys.length} pubkeys `
                + `and ${multisigData.numSignatures} numSignatures`);
  }

  let walletConfig;
  if ('xpubkey' in req.body) {
    try {
      // starting a readonly wallet
      walletConfig = getReadonlyWalletConfig({
        xpub: req.body.xpubkey,
        multisigData,
      });
    } catch (e) {
      if (e instanceof WalletStartError) {
        res.send({
          success: false,
          message: e.message,
        });
        return;
      }
      // Unhandled error
      throw e;
    }
  } else {
    // Starting a wallet seed or seedKey
    let seed;
    let seedKey;
    if ('seedKey' in req.body) {
      seedKey = req.body.seedKey;
      if (!(seedKey in config.seeds)) {
        res.send({
          success: false,
          message: 'Seed not found.',
        });
        return;
      }
      seed = config.seeds[seedKey];
    } else {
      seed = req.body.seed;
    }

    try {
      walletConfig = getWalletConfigFromSeed({
        seed,
        multisigData,
        passphrase: req.body.passphrase,
      });
    } catch (e) {
      if (e instanceof WalletStartError) {
        res.send({
          success: false,
          message: e.message,
        });
        return;
      }
      // Unhandled error
      throw e;
    }
  }

  const connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });
  walletConfig.connection = connection;

  // tokenUid is optional but if not passed as parameter the wallet will use HTR
  if (config.tokenUid) {
    walletConfig.tokenUid = config.tokenUid;
  }

  const preCalculatedAddresses = 'precalculatedAddresses' in req.body ? req.body.preCalculatedAddresses : [];
  if (preCalculatedAddresses && preCalculatedAddresses.length) {
    console.log(`Received pre-calculated addresses`, sanitizeLogInput(preCalculatedAddresses));
    walletConfig.preCalculatedAddresses = preCalculatedAddresses;
  }

  const wallet = new HathorWallet(walletConfig);

  if (config.gapLimit) {
    // XXX: The gap limit is now a per-wallet configuration
    // To keep the same behavior as before, we set the gap limit
    // when creating the wallet, but we should move this to the
    // wallet configuration in the future
    await wallet.setGapLimit(config.gapLimit);
  }

  // subscribe to wallet events with notificationBus
  notificationBus.subscribeHathorWallet(walletID, wallet);

  wallet.start().then(info => {
    // The replace avoids Log Injection
    console.log(
      `Wallet started with wallet id ${sanitizeLogInput(walletID)}. \
Full-node info: ${JSON.stringify(info, null, 2)}`
    );

    initializedWallets.set(walletID, wallet);
    res.send({
      success: true,
    });
  }, error => {
    console.error('Error:', error);
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletID}`,
    });
  });
}

function multisigPubkey(req, res) {
  if (!('seedKey' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'seedKey\' is required.',
    });
    return;
  }

  const { seedKey } = req.body;
  if (!(seedKey in config.seeds)) {
    res.send({
      success: false,
      message: 'Seed not found.',
    });
    return;
  }

  const seed = config.seeds[seedKey];

  const options = { networkName: config.network };
  if ('passphrase' in req.body) {
    options.passphrase = req.body.passphrase;
  }

  res.send({
    success: true,
    xpubkey: walletUtils.getMultiSigXPubFromWords(seed, options),
  });
}

function getConfigurationString(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  // Expects token uid
  const { token } = req.query;
  walletApi.getGeneralTokenInfo(token, response => {
    if (response.success) {
      const { name, symbol } = response;
      res.send({
        success: true,
        configurationString: tokensUtils.getConfigurationString(token, name, symbol)
      });
    } else {
      res.send({
        success: false,
        message: 'Invalid token uid.',
      });
    }
  });
}

async function pushTxHex(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { txHex } = req.body;

  try {
    const network = new Network(config.network);
    const tx = helpersUtils.createTxFromHex(txHex, network);
    const sendTransaction = new SendTransaction({ transaction: tx });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, tx: mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

module.exports = {
  welcome,
  docs,
  start,
  multisigPubkey,
  getConfigurationString,
  pushTxHex,
};
