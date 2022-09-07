/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { walletApi, tokensUtils, walletUtils, errors, Connection, HathorWallet } = require('@hathor/wallet-lib');
const apiDocs = require('../api-docs');
const config = require('../config');
const { initializedWallets } = require('../services/wallets.service');
const { notificationBus } = require('../services/notification.service');
const { API_ERROR_CODES } = require('../helpers/constants');
const { parametersValidation } = require('../helpers/validations.helper');

function welcome(req, res) {
  res.send('<html><body><h1>Welcome to Hathor Wallet API!</h1>'
           + '<p>See the <a href="docs/">docs</a></p></body></html>');
}

function docs(req, res) {
  res.send(apiDocs);
}

function start(req, res) {
  // We expect the user to send the seed he wants to use
  if (!('seedKey' in req.body) && !('seed' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'seedKey\' or \'seed\' is required.',
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

  // Seed validation
  try {
    const ret = walletUtils.wordsValid(seed);
    seed = ret.words;
  } catch (e) {
    if (e instanceof errors.InvalidWords) {
      res.send({
        success: false,
        message: `Invalid seed: ${e.message}`,
      });
      return;
    }
    // Unhandled error
    throw e;
  }

  // The user must send a key to index this wallet
  if (!('wallet-id' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'wallet-id\' is required.',
    });
    return;
  }

  let multisigData = null;
  if (('multisig' in req.body) && (req.body.multisig !== false)) {
    if (!(config.multisig && (seedKey in config.multisig))) {
      // Trying to start a multisig without proper configuration
      res.send({
        success: false,
        message: `Seed ${seedKey} is not configured for multisig.`
      });
      return;
    }
    // validate multisig configuration:
    //   (i) Should have all fields
    //  (ii) `pubkeys` length should match `total`
    // (iii) `numSignatures` should be less or equal to `total`
    const mconfig = config.multisig[seedKey];
    if (!(mconfig
           && (mconfig.total && mconfig.numSignatures && mconfig.pubkeys)
           && (mconfig.pubkeys.length === mconfig.total)
           && (mconfig.numSignatures <= mconfig.total))) {
      // Missing multisig items
      res.send({
        success: false,
        message: `Improperly configured multisig for seed ${seedKey}.`
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

  const connection = new Connection({
    network: config.network,
    servers: [config.server],
    connectionTimeout: config.connectionTimeout,
  });
  // Previous versions of the lib would have password and pin default as '123'
  // We currently need something to be defined, otherwise we get an error when starting the wallet
  const walletConfig = {
    seed,
    connection,
    password: '123',
    pinCode: '123',
    multisig: multisigData,
  };

  // tokenUid is optionat but if not passed as parameter
  // the wallet will use HTR
  if (config.tokenUid) {
    walletConfig.tokenUid = config.tokenUid;
  }

  // Passphrase is optional but if not passed as parameter
  // the wallet will use empty string
  if (req.body.passphrase) {
    // If config explicitly allows the /start endpoint to have a passphrase
    const allowPassphrase = config.allowPassphrase || false;

    if (!allowPassphrase) {
      // To use a passphrase on /start POST request the configuration of the headless must
      // explicitly allow it
      console.error('Failed to start wallet because using a passphrase is not allowed by '
                  + 'the current config. See allowPassphrase.');
      res.send({
        success: false,
        message: 'Failed to start wallet. To use a passphrase you must explicitly allow it in the configuration file. Using a passphrase completely changes the addresses of your wallet, only use it if you know what you are doing.',
      });
      return;
    }
    walletConfig.passphrase = req.body.passphrase;
  }
  const walletID = req.body['wallet-id'];

  // Wallet addresses pre-calculation, usually for speeding up tests
  if (req.body.preCalculatedAddresses && req.body.preCalculatedAddresses.length) {
    console.log(`Received pre-calculated addresses`, req.body.preCalculatedAddresses);
    walletConfig.preCalculatedAddresses = req.body.preCalculatedAddresses;
  }

  if (walletID in initializedWallets) {
    // We already have a wallet for this key
    // so we log that it won't start a new one because
    // it must first stop the old wallet and then start the new
    console.error('Error starting wallet because this wallet-id is already in use. You must stop the wallet first.');
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletID}`,
      errorCode: API_ERROR_CODES.WALLET_ALREADY_STARTED
    });
    return;
  }

  const wallet = new HathorWallet(walletConfig);

  // XXX: subscribe to wallet events with notificationBus
  notificationBus.subscribeHathorWallet(req.body['wallet-id'], wallet);

  wallet.start().then(info => {
    console.log(`Wallet started with wallet id ${req.body['wallet-id']}. Full-node info: `, info);
    initializedWallets[req.body['wallet-id']] = wallet;
    res.send({
      success: true,
    });
  }, error => {
    console.error('Error:', error);
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${req.body['wallet-id']}`,
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

module.exports = {
  welcome,
  docs,
  start,
  multisigPubkey,
  getConfigurationString,
};
