/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { walletApi, tokensUtils, walletUtils, Network, helpersUtils, SendTransaction, constants: hathorLibConstants } = require('@hathor/wallet-lib');
const { getApiDocs } = require('../api-docs');
const { initializedWallets, startWallet } = require('../services/wallets.service');
const { cantSendTxErrorMessage, API_ERROR_CODES } = require('../helpers/constants');
const { parametersValidation } = require('../helpers/validations.helper');
const { sanitizeLogInput } = require('../logger');
const { getReadonlyWalletConfig, getWalletConfigFromSeed } = require('../helpers/wallet.helper');
const { WalletStartError } = require('../errors');
const { mapTxReturn } = require('../helpers/tx.helper');
const { lock, lockTypes } = require('../lock');
const settings = require('../settings');

const { GAP_LIMIT } = hathorLibConstants;

function welcome(req, res) {
  res.send('<html><body><h1>Welcome to Hathor Wallet API!</h1>'
           + '<p>See the <a href="docs/">docs</a></p></body></html>');
}

function docs(req, res) {
  res.send(getApiDocs());
}

async function start(req, res) {
  const config = settings.getConfig();
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

  // Validate address scanning policy
  let scanPolicyData = null;
  if ('scanPolicy' in req.body) {
    const policy = req.body.scanPolicy;
    switch (policy) {
      case 'index-limit':
        /**
         * The policy configuration is composed by:
         * - policyStartIndex
         *   - optional, defaults to 0
         * - policyEndIndex
         *   - optional, defaults to policyStartIndex
         *
         * If no configuration is passed, only the first address will be loaded.
         *
         * Obs: The route does not use validation or parser, so we need to parse the integers
         */

        // parseInt returns NaN (falsy) for null, undefined or malformed number strings
        scanPolicyData = {
          policy,
          startIndex: parseInt(req.body.policyStartIndex, 10) || 0,
        };
        scanPolicyData.endIndex = parseInt(req.body.policyEndIndex, 10)
          || scanPolicyData.startIndex;
        break;
      case 'gap-limit':
        // The gapLimit is optional and will default to 20
        scanPolicyData = {
          policy,
          gapLimit: parseInt(req.body.gapLimit, 10) || GAP_LIMIT,
        };
        break;
      default:
        // address scanning policy requested is not supported
        res.send({
          success: false,
          message: `Address scanning policy ${policy} is not supported.`,
        });
        return;
    }
  }

  let walletConfig;
  if ('xpubkey' in req.body) {
    try {
      // starting a readonly wallet
      walletConfig = getReadonlyWalletConfig({
        xpub: req.body.xpubkey,
        multisigData,
        scanPolicy: scanPolicyData,
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
        allowPassphrase: config.allowPassphrase,
        scanPolicy: scanPolicyData,
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

  const preCalculatedAddresses = 'precalculatedAddresses' in req.body ? req.body.preCalculatedAddresses : [];
  if (preCalculatedAddresses && preCalculatedAddresses.length) {
    console.log(`Received pre-calculated addresses`, sanitizeLogInput(preCalculatedAddresses));
    walletConfig.preCalculatedAddresses = preCalculatedAddresses;
  }

  startWallet(walletID, walletConfig, config)
    .then(info => {
      res.send({
        success: true,
      });
    })
    .catch(error => {
      console.error('Error:', error);
      res.send({
        success: false,
        message: `Failed to start wallet with wallet id ${walletID}`,
      });
    });
}

function multisigPubkey(req, res) {
  const config = settings.getConfig();

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
  const config = settings.getConfig();

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
    if (!tx.weight) {
      // We need to prepare this tx adding weight and timestamp
      tx.prepareToSend();
    }
    const sendTransaction = new SendTransaction({ transaction: tx });
    const response = await sendTransaction.runFromMining();
    res.send({ success: true, tx: mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function reloadConfig(_, res) {
  await settings.reloadConfig();
  res.send({ success: true });
}

module.exports = {
  welcome,
  docs,
  start,
  multisigPubkey,
  getConfigurationString,
  pushTxHex,
  reloadConfig,
};
