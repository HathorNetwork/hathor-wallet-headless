/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import { Wallet } from '@hathor/wallet-lib';

import config from './config';
import apiDocs from './api-docs';
import apiKeyAuth from './api-key-auth';

const wallet = new Wallet(config);
wallet.on('state', (state) => {
  console.log(`State changed to: ${Wallet.getHumanState(state)}`);
});

wallet.on('new-tx', (tx) => {
  //console.log('New tx arrived:', tx);
});

wallet.on('update-tx', (tx) => {
  //console.log('Tx updated:', tx);
});

const app = express();
const walletRouter = express.Router()

app.get('/', (req, res) => {
  res.send('<html><body><h1>Welcome to Hathor Wallet API!</h1><p>See the <a href="docs/">docs</a></p></body></html>');
});

app.get('/docs', (req, res) => {
  res.send(apiDocs);
});

app.get('/status', (req, res) => {
  res.send({
    'statusCode': wallet.state,
    'statusMessage': Wallet.getHumanState(wallet.state),
    'network': wallet.network,
    'serverUrl': wallet.server,
    'serverInfo': wallet.serverInfo,
  });
});

walletRouter.use((req, res, next) => {
  if (!wallet.isReady()) {
    res.send({
      success: false,
      errmsg: 'Wallet is not ready.',
      state: wallet.state,
    });
    return;
  }
  next();
});

walletRouter.get('/balance', (req, res) => {
  const balance = wallet.getBalance();
  res.send(balance);
});

walletRouter.get('/address', (req, res) => {
  let address;
  if ('mark_as_used' in req.query) {
    address = wallet.getAddressToUse();
  } else {
    address = wallet.getCurrentAddress();
  }
  res.send({ address });
});

walletRouter.get('/tx-history', (req, res) => {
  // TODO Add pagination
  res.send(wallet.getTxHistory());
});

walletRouter.post('/simple-send-tx', (req, res) => {
  const address = req.body.address;
  const value = parseInt(req.body.value);
  wallet.sendTransaction(address, value).then((response) => {
    res.send(response);
  }, (error) => {
    res.send({success: false, error});
  });
});

if (config.http_api_key) {
  app.use(apiKeyAuth(config.http_api_key));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/0', walletRouter);

app.listen(config.http_port, config.http_bind_address, () => {
  console.log(`Hathor Wallet listening on ${config.http_bind_address}:${config.http_port}...`);
  wallet.start().then((info) => {
    console.log('Full-node info:', info);
  }, (error) => {
    console.log('Error:', error);
    process.exit(-1);
  });
});

