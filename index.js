/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import { Connection, HathorWallet } from '@hathor/wallet-lib';

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
  const connection = new Connection({network: config.network, servers: [config.server]});
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

  // Adding to req parameter, so we don't need to get it in all requests
  req.wallet = wallet;
  req.walletId = walletId;
  next();
});

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

walletRouter.get('/balance', (req, res) => {
  const wallet = req.wallet;
  const balance = wallet.getBalance();
  res.send(balance);
});

walletRouter.get('/address', (req, res) => {
  const wallet = req.wallet;
  const markAsUsed = req.query.mark_as_used || false;
  const address = wallet.getCurrentAddress({markAsUsed});
  res.send({ address });
});

walletRouter.get('/addresses', (req, res) => {
  const wallet = req.wallet;
  // TODO Add pagination
  const addresses = wallet.getAllAddresses();
  res.send({ addresses });
});

walletRouter.get('/tx-history', (req, res) => {
  // TODO Add pagination
  const wallet = req.wallet;
  res.send(wallet.getTxHistory());
});

walletRouter.post('/simple-send-tx', (req, res) => {
  const wallet = req.wallet;
  const address = req.body.address;
  const value = parseInt(req.body.value);
  const ret = wallet.sendTransaction(address, value);
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

walletRouter.post('/send-tx', (req, res) => {
  const wallet = req.wallet;
  const outputs = req.body.outputs;
  const inputs = req.body.inputs || [];
  const ret = wallet.sendManyOutputsTransaction(outputs, inputs)
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

