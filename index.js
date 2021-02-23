/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import { Connection, HathorWallet, wallet as walletUtils, tokens } from '@hathor/wallet-lib';

import config from './config';
import apiDocs from './api-docs';
import apiKeyAuth from './api-key-auth';

const wallets = {};

const humanState = {
  [HathorWallet.CLOSED]: 'Closed',
  [HathorWallet.CONNECTING]: 'Connecting',
  [HathorWallet.SYNCING]: 'Syncing',
  [HathorWallet.READY]: 'Ready',
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const walletRouter = express.Router({mergeParams: true})

app.get('/', (req, res) => {
  res.send('<html><body><h1>Welcome to Hathor Wallet API!</h1><p>See the <a href="docs/">docs</a></p></body></html>');
});

app.get('/docs', (req, res) => {
  res.send(apiDocs);
});

/**
 * POST request to start a new wallet
 * For the docs, see api-docs.js
 */
app.post('/start', (req, res) => {
  // We expect the user to send the seed he wants to use
  if (!('seedKey' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'seedKey\' is required.',
    });
    return;
  }

  const seedKey = req.body.seedKey;
  if (!(seedKey in config.seeds)) {
    res.send({
      success: false,
      message: 'Seed not found.',
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

  const seed = config.seeds[seedKey];
  const connection = new Connection({network: config.network, servers: [config.server], connectionTimeout: config.connectionTimeout});
  const walletConfig = {
    seed,
    connection
  }

  // tokenUid is optionat but if not passed as parameter
  // the wallet will use HTR
  if (config.tokenUid) {
    walletConfig['tokenUid'] = config.tokenUid;
  }

  // Passphrase is optional but if not passed as parameter
  // the wallet will use empty string
  if (req.body.passphrase) {
    walletConfig['passphrase'] = req.body.passphrase;
  }
  const walletID = req.body['wallet-id'];

  if (walletID in wallets) {
    // We already have a wallet for this key
    // so we log that it won't start a new one because
    // it must first stop the old wallet and then start the new
    console.log('Error starting wallet because this wallet-id is already in use. You must stop the wallet first.');
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${walletID}`,
    });
    return;
  }

  const wallet = new HathorWallet(walletConfig);
  wallet.start().then((info) => {
    console.log(`Wallet started with wallet id ${req.body['wallet-id']}. Full-node info: `, info);
    wallets[req.body['wallet-id']] = wallet;
    res.send({
      success: true,
    });
  }, (error) => {
    console.log('Error:', error);
    res.send({
      success: false,
      message: `Failed to start wallet with wallet id ${req.body['wallet-id']}`,
    });
  });
});

walletRouter.use((req, res, next) => {
  const sendError = (message, state) => {
    res.send({
      success: false,
      message,
      state,
    });
  }

  // Get X-WALLET-ID header that defines which wallet the request refers to
  if (!('x-wallet-id' in req.headers)) {
    sendError('Header \'X-Wallet-Id\' is required.');
    return;
  }

  const walletId = req.headers['x-wallet-id'];
  if (!(walletId in wallets)) {
    sendError('Invalid wallet id parameter.')
    return;
  }

  const wallet = wallets[walletId];
  if (!wallet.isReady()) {
    sendError('Wallet is not ready.', wallet.state)
    return;
  }

  console.log('Received request to', req.originalUrl)

  // Adding to req parameter, so we don't need to get it in all requests
  req.wallet = wallet;
  req.walletId = walletId;
  next();
});

/**
 * GET request to get the status of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/status', (req, res) => {
  const wallet = req.wallet;
  res.send({
    'statusCode': wallet.state,
    'statusMessage': humanState[wallet.state],
    'network': wallet.network,
    'serverUrl': wallet.server,
    'serverInfo': wallet.serverInfo,
  });
});

/**
 * GET request to get the balance of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/balance', (req, res) => {
  const wallet = req.wallet;
  // Expects token uid
  const token = req.query.token || null;
  const balance = wallet.getBalance(token);
  res.send(balance);
});

/**
 * GET request to get an address of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/address', (req, res) => {
  const wallet = req.wallet;
  const index = req.query.index || null;
  let address;
  if (index !== null) {
    address = wallet.getAddressAtIndex(parseInt(index));
  } else {
    const markAsUsed = req.query.mark_as_used || false;
    address = wallet.getCurrentAddress({markAsUsed});
  }
  res.send({ address });
});

/**
 * GET request to get all addresses of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/addresses', (req, res) => {
  const wallet = req.wallet;
  // TODO Add pagination
  const addresses = wallet.getAllAddresses();
  res.send({ addresses });
});

/**
 * GET request to get the transaction history of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/tx-history', (req, res) => {
  // TODO Add pagination
  const wallet = req.wallet;
  const limit = req.query.limit || null;
  const history = wallet.getTxHistory();
  if (limit) {
    const values = Object.values(history);
    const sortedValues = values.sort((a, b) => b.timestamp - a.timestamp);
    res.send(sortedValues.slice(0, limit));
  } else {
    res.send(Object.values(history));
  }
});

/**
 * POST request to send a transaction with only one output
 * For the docs, see api-docs.js
 */
walletRouter.post('/simple-send-tx', (req, res) => {
  const wallet = req.wallet;
  const address = req.body.address;
  const value = parseInt(req.body.value);
  // Expects object with {'uid', 'name', 'symbol'}
  const token = req.body.token || null;
  const changeAddress = req.body.change_address || null;
  const ret = wallet.sendTransaction(address, value, token, { changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }, (error) => {
      res.send({success: false, error});
    });
  } else {
    res.send({success: false, error: ret.message});
  }
});

/**
 * POST request to send a transaction with many outputs and inputs selection
 * For the docs, see api-docs.js
 */
walletRouter.post('/send-tx', (req, res) => {
  const wallet = req.wallet;
  const outputs = req.body.outputs;
  // Expects array of objects with {'hash', 'index'}
  const inputs = req.body.inputs || [];
  // Expects object with {'uid', 'name', 'symbol'}
  const token = req.body.token || null;
  const changeAddress = req.body.change_address || null;
  const ret = wallet.sendManyOutputsTransaction(outputs, inputs, token, { changeAddress })
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }, (error) => {
      res.send({success: false, error});
    });
  } else {
    res.send({success: false, error: ret.message});
  }
});

/**
 * POST request to create a token
 * For the docs, see api-docs.js
 */
walletRouter.post('/create-token', (req, res) => {
  const wallet = req.wallet;
  const name = req.body.name;
  const symbol = req.body.symbol;
  const amount = parseInt(req.body.amount);
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const ret = wallet.createNewToken(name, symbol, amount, address, { changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }, (error) => {
      res.send({success: false, error});
    });
  } else {
    res.send({success: false, error: ret.message});
  }
});

/**
 * POST request to mint tokens
 * For the docs, see api-docs.js
 */
walletRouter.post('/mint-tokens', (req, res) => {
  const wallet = req.wallet;
  const token = req.body.token;
  const amount = parseInt(req.body.amount);
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const ret = wallet.mintTokens(token, amount, address, { changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }, (error) => {
      res.send({success: false, error});
    });
  } else {
    res.send({success: false, error: ret.message});
  }
});

/**
 * POST request to melt tokens
 * For the docs, see api-docs.js
 */
walletRouter.post('/melt-tokens', (req, res) => {
  const wallet = req.wallet;
  const token = req.body.token;
  const amount = parseInt(req.body.amount);
  const changeAddress = req.body.change_address || null;
  const depositAddress = req.body.deposit_address || null;
  const ret = wallet.meltTokens(token, amount, { depositAddress, changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }, (error) => {
      res.send({success: false, error});
    });
  } else {
    res.send({success: false, error: ret.message});
  }
});

/**
 * POST request to stop a wallet
 * For the docs, see api-docs.js
 */
walletRouter.post('/stop', (req, res) => {
  // Stop wallet and remove from wallets object
  const wallet = req.wallet;
  wallet.stop();

  delete wallets[req.walletId];
  res.send({success: true});
});

if (config.http_api_key) {
  app.use(apiKeyAuth(config.http_api_key));
}
app.use('/wallet', walletRouter);

app.listen(config.http_port, config.http_bind_address, () => {
  console.log(`Hathor Wallet listening on ${config.http_bind_address}:${config.http_port}...`);
});

if (config.gapLimit) {
  console.log(`Set GAP LIMIT to ${config.gapLimit}`);
  walletUtils.setGapLimit(config.gapLimit);
}

