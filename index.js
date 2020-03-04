/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import { HathorWallet } from '@hathor/wallet-lib';

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
  // if not sent, we use the 'default' key
  const seedKey = req.body.seedKey || 'default';
  if (!(seedKey in config.seeds)) {
    res.send({
      success: false,
      message: 'Seed not found.',
    });
    return;
  }

  // The user must send a key to index this wallet
  if (!('key' in req.body)) {
    res.send({
      success: false,
      message: 'Parameter \'key\' is required.',
    });
    return;
  }

  const seed = config.seeds[seedKey];

  const walletConfig = {
    network: config.network,
    server: config.server,
    seed,
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
  wallets[req.body.key] = wallet;
  wallet.start().then((info) => {
    console.log(`Wallet started with key ${req.body.key}. Full-node info: `, info);
    res.send({
      success: true,
    });
  }, (error) => {
    console.log('Error:', error);
    res.send({
      success: false,
      message: `Failed to start wallet with key ${req.body.key}`,
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

  if (!('key' in req.body)) {
    sendError('Parameter \'key\' is required.');
    return;
  }

  const key = req.body.key;
  if (!(key in wallets)) {
    sendError('Invalid key parameter.')
    return;
  }

  const wallet = wallets[key];
  if (!wallet.isReady()) {
    sendError('Wallet is not ready.', wallet.state)
    return;
  }

  // Adding to req parameter, so we don't need to get it in all requests
  req.wallet = wallet;
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
  const markAsUsed = req.body.mark_as_used || false;
  const address = wallet.getCurrentAddress({markAsUsed});
  res.send({ address });
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
  wallet.sendTransaction(address, value).then((response) => {
    res.send(response);
  }, (error) => {
    res.send({success: false, error});
  });
});

walletRouter.post('/stop', (req, res) => {
  // Stop wallet and remove from wallets object
  const wallet = req.wallet;
  wallet.stop();

  const key = req.body.key;
  delete wallets[key];
  res.send({success: true});
});

if (config.http_api_key) {
  app.use(apiKeyAuth(config.http_api_key));
}
app.use('/wallet', walletRouter);

app.listen(config.http_port, config.http_bind_address, () => {
  console.log(`Hathor Wallet listening on ${config.http_bind_address}:${config.http_port}...`);
});

