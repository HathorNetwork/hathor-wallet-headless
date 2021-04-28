/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import express from 'express';
import morgan from 'morgan';
import { Connection, HathorWallet, Network, wallet as walletUtils, tokens, errors } from '@hathor/wallet-lib';
import { body, checkSchema, matchedData, query, validationResult } from 'express-validator';

import config from './config';
import apiDocs from './api-docs';
import apiKeyAuth from './api-key-auth';
import logger from './logger';
import version from './version';
import { lock, lockTypes } from './lock';

// Error message when the user tries to send a transaction while the lock is active
const cantSendTxErrorMessage = 'You already have a transaction being sent. Please wait until it\'s done to send another.';

// If config explicitly allows the /start endpoint to have a passphrase
const allowPassphrase = config.allowPassphrase || false;

const wallets = {};

const humanState = {
  [HathorWallet.CLOSED]: 'Closed',
  [HathorWallet.CONNECTING]: 'Connecting',
  [HathorWallet.SYNCING]: 'Syncing',
  [HathorWallet.READY]: 'Ready',
  [HathorWallet.ERROR]: 'Error',
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.httpLogFormat || 'combined', { stream: logger.stream }));
if (config.http_api_key) {
  app.use(apiKeyAuth(config.http_api_key));
}
const walletRouter = express.Router({mergeParams: true})

const parametersValidation = (req) => {
  // Parameters validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {success: false, error: errors.array()};
  } else {
    return {success: true};
  }

}

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
    if (!allowPassphrase) {
      // To use a passphrase on /start POST request the configuration of the headless must explicitly allow it
      console.log('Failed to start wallet because using a passphrase is not allowed by the current config. See allowPassphrase.');
      res.send({
        success: false,
        message: 'Failed to start wallet. To use a passphrase you must explicitly allow it in the configuration file. Using a passphrase completely changes the addresses of your wallet, only use it if you know what you are doing.',
      });
      return;
    }
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

  const wallet = new HathorWallet(seed, new Network(config.network));
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
      'statusCode': state,
      'statusMessage': (state ? humanState[state] : ''),
    });
  }

  // Get X-WALLET-ID header that defines which wallet the request refers to
  if (!('x-wallet-id' in req.headers)) {
    sendError('Header \'X-Wallet-Id\' is required.');
    return;
  }

  const walletId = req.headers['x-wallet-id'];
  if (!(walletId in wallets)) {
    sendError('Invalid wallet id parameter.');
    return;
  }
  const wallet = wallets[walletId];

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
walletRouter.get(
  '/balance',
  query('token').isString().optional(),
  async (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }
  const wallet = req.wallet;
  // Expects token uid, default is HTR
  const token = req.query.token || '00';
  try {
    const balance = await wallet.getBalance(token);
    res.send(balance);
  } catch (err) {
    res.send({success: false, error: err.message });
  }
});

/**
 * GET request to get an address of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/address',
  query('index').isInt({ min: 0 }).optional().toInt(),
  query('mark_as_used').isBoolean().optional().toBoolean(),
  (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }
  const wallet = req.wallet;
  const index = req.query.index;
  let address;
  if (index !== undefined) {
    // Because of isInt and toInt, it's safe to assume that index is now an integer >= 0
    address = wallet.getAddressAtIndex(index);
  } else {
    const markAsUsed = req.query.mark_as_used || false;
    address = wallet.getCurrentAddress({markAsUsed});
  }
  res.send({ address });
});

/**
 * GET request to get an address index
 * For the docs, see api-docs.js
 */
walletRouter.get('/address-index',
  query('address').isString(),
  (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }
  const wallet = req.wallet;
  const address = req.query.address;
  const index = wallet.getAddressIndex(address);
  if (index === null) {
    // Address does not belong to the wallet
    res.send({ success: false });
  } else {
    res.send({ success: true, index });
  }
});

/**
 * GET request to get all addresses of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/addresses', async (req, res) => {
  const wallet = req.wallet;
  // TODO Add pagination
  try {
    const addresses = await wallet.getAllAddresses();
    res.send({ addresses });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
});

/**
 * GET request to get the transaction history of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/tx-history',
  query('token').isString().optional(),
  async (req, res) => {
  // TODO Add pagination
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }
  const wallet = req.wallet;
  const token = req.query.token || null;
  try {
    const history = await wallet.getTxHistory({ token });
    res.send({ history });
  } catch (err) {
    res.send({success: false, error: err.message });
  }
});

/**
 * GET request to get a transaction from the wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/transaction',
  query('id').isString(),
  (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }
  const wallet = req.wallet;
  const id = req.query.id;
  const tx = wallet.getTx(id);
  if (tx) {
    res.send(tx);
  } else {
    res.send({success: false, error: `Wallet does not contain transaction with id ${id}`});
  }
});

/**
 * POST request to send a transaction with only one output
 * For the docs, see api-docs.js
 *
 * For this API we use checkSchema for parameter validation because we have
 * objects that are optionals. For those objects, there is no easy way to validate saying that
 * the objects is optional but if presented, the fields on it must be required.
 * To achieve this validation we must create a custom validator.
 */
walletRouter.post('/simple-send-tx',
  checkSchema({
    address: {
      in: ['body'],
      isString: true
    },
    value: {
      in: ['body'],
      isInt: {
        options: {
          min: 1
        }
      },
      toInt: true
    },
    'change_address': {
      in: ['body'],
      isString: true,
      optional: true
    },
    token: {
      in: ['body'],
      isString: true,
      optional: true
    }
  }),
  async (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({success: false, error: cantSendTxErrorMessage});
    return;
  }

  const wallet = req.wallet;
  const address = req.body.address;
  const value = req.body.value;
  const token = req.body.token || '00';
  const changeAddress = req.body.change_address || null;
  try {
    const response = await wallet.sendTransaction(address, value, { token, changeAddress });
    res.send({ success: true, ...response });
  } catch (err) {
    console.log('Deu erro aqui');
    console.log(err);
    const ret = {success: false, error: err.message };
    if (err.response && err.response.data && err.response.data.error) {
      ret['code'] = err.response.data.error;
    }
    res.send(ret);
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
});

/**
 * POST request to send a transaction with many outputs and inputs selection
 * For the docs, see api-docs.js
 *
 * For this API we use checkSchema for parameter validation because we have
 * objects that are optionals. For those objects, there is no easy way to validate saying that
 * the objects is optional but if presented, the fields on it must be required.
 * To achieve this validation we must create a custom validator.
 */
walletRouter.post('/send-tx',
  checkSchema({
    outputs: {
      in: ['body'],
      isArray: true,
    },
    'outputs.*.address': {
      in: ['body'],
      isString: true,
    },
    'outputs.*.value': {
      in: ['body'],
      isInt: {
        options: {
          min: 1
        }
      },
      toInt: true
    },
    inputs: {
      in: ['body'],
      isArray: true,
      optional: true,
    },
    'inputs.*': {
      in: ['body'],
      isObject: true,
      custom: {
        options: (value, { req, location, path }) => {
          if (!('txId' in value) || !(typeof value.txId === 'string')) {
            return false;
          }
          if (!('index' in value) || !(/^\d+$/.test(value.index))) {
            // Test that index is required and it's an integer
            return false;
          }
          if (!value.txId) {
            // the regex in value.index already test for empty string
            return false;
          }
          return true;
        }
      },
      customSanitizer: {
        options: (value) => {
          const sanitizedValue = Object.assign({}, value, {index: parseInt(value.index)});
          return sanitizedValue;
        }
      }
    },
    'change_address': {
      in: ['body'],
      isString: true,
      optional: true
    },
    token: {
      in: ['body'],
      isObject: true,
      optional: true,
      custom: {
        options: (value, { req, location, path }) => {
          if (!('name' in value) || !(typeof value.name === 'string')) {
            return false;
          }
          if (!('uid' in value) || !(typeof value.uid === 'string')) {
            return false;
          }
          if (!('symbol' in value) || !(typeof value.symbol === 'string')) {
            return false;
          }
          if (!value.name || !value.uid || !value.symbol) {
            return false;
          }
          return true;
        }
      }
    }
  }),
  async (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({success: false, error: cantSendTxErrorMessage});
    return;
  }

  const wallet = req.wallet;
  const outputs = req.body.outputs;
  // Expects array of objects with {'txId', 'index'}
  const inputs = req.body.inputs || [];
  // Expects object with {'uid', 'name', 'symbol'}
  const token = req.body.token || '00';
  const changeAddress = req.body.change_address || null;

  try {
    const response = await wallet.sendManyOutputsTransaction(outputs, { inputs, changeAddress });
    res.send({ success: true, ...response });
  } catch (err) {
    console.log('Deu erro aqui');
    console.log(err);
    const ret = {success: false, error: err.message };
    if (err.response && err.response.data && err.response.data.error) {
      ret['code'] = err.response.data.error;
    }
    res.send(ret);
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
});

/**
 * POST request to create a token
 * For the docs, see api-docs.js
 */
walletRouter.post('/create-token',
  body('name').isString(),
  body('symbol').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('address').isString().optional(),
  body('change_address').isString().optional(),
  (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({success: false, error: cantSendTxErrorMessage});
    return;
  }

  const wallet = req.wallet;
  const name = req.body.name;
  const symbol = req.body.symbol;
  const amount = req.body.amount;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const ret = wallet.createNewToken(name, symbol, amount, address, { changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send({ success: true, ...response });
    }).catch((error) => {
      res.send({success: false, error});
    }).finally(() => {
      lock.unlock(lockTypes.SEND_TX);
    });
  } else {
    res.send({success: false, error: ret.message});
    lock.unlock(lockTypes.SEND_TX);
  }
});

/**
 * POST request to mint tokens
 * For the docs, see api-docs.js
 */
walletRouter.post('/mint-tokens',
  body('token').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('address').isString().optional(),
  body('change_address').isString().optional(),
  (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({success: false, error: cantSendTxErrorMessage});
    return;
  }

  const wallet = req.wallet;
  const token = req.body.token;
  const amount = req.body.amount;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const ret = wallet.mintTokens(token, amount, address, { changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }).catch((error) => {
      res.send({success: false, error});
    }).finally(() => {
      lock.unlock(lockTypes.SEND_TX);
    });
  } else {
    res.send({success: false, error: ret.message});
    lock.unlock(lockTypes.SEND_TX);
  }
});

/**
 * POST request to melt tokens
 * For the docs, see api-docs.js
 */
walletRouter.post('/melt-tokens',
  body('token').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('change_address').isString().optional(),
  body('deposit_address').isString().optional(),
  (req, res) => {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    return res.status(400).json(validationResult);
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({success: false, error: cantSendTxErrorMessage});
    return;
  }

  const wallet = req.wallet;
  const token = req.body.token;
  const amount = req.body.amount;
  const changeAddress = req.body.change_address || null;
  const depositAddress = req.body.deposit_address || null;
  const ret = wallet.meltTokens(token, amount, { depositAddress, changeAddress });
  if (ret.success) {
    ret.promise.then((response) => {
      res.send(response);
    }).catch((error) => {
      res.send({success: false, error});
    }).finally(() => {
      lock.unlock(lockTypes.SEND_TX);
    });
  } else {
    res.send({success: false, error: ret.message});
    lock.unlock(lockTypes.SEND_TX);
  }
});

/**
 * GET request to filter utxos before consolidation
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/utxo-filter',
  query('max_utxos').isInt().optional().toInt(),
  query('token').isString().optional(),
  query('filter_address').isString().optional(),
  query('amount_smaller_than').isInt().optional().toInt(),
  query('amount_bigger_than').isInt().optional().toInt(),
  query('maximum_amount').isInt().optional().toInt(),
  query('only_available').isBoolean().optional().toBoolean(),
  (req, res) => {
    try {
      const validationResult = parametersValidation(req);
      if (!validationResult.success) {
        return res.status(400).json(validationResult);
      }

      const wallet = req.wallet;
      const options = matchedData(req, { locations: ['query'] });
      // TODO Memory usage enhancements are required here as wallet.getUtxos can cause issues on wallets with a huge amount of utxos.
      // TODO Add pagination
      const ret = wallet.getUtxos(options);
      res.send(ret);
    } catch(error) {
      res.send({ success: false, error: error.message || error });
    }
  }
);

/**
 * POST request to consolidate utxos
 * For the docs, see api-docs.js
 */
walletRouter.post(
  '/utxo-consolidation',
  body('destination_address').isString(),
  body('max_utxos').isInt().optional().toInt(),
  body('token').isString().optional(),
  body('filter_address').isString().optional(),
  body('amount_smaller_than').isInt().optional().toInt(),
  body('amount_bigger_than').isInt().optional().toInt(),
  body('maximum_amount').isInt().optional().toInt(),
  async (req, res) => {
    try {
      // Body parameters validation
      const validationResult = parametersValidation(req);
      if (!validationResult.success) {
        return res.status(400).json(validationResult);
      }

      const canStart = lock.lock(lockTypes.SEND_TX);
      if (!canStart) {
        res.send({success: false, error: cantSendTxErrorMessage});
        return;
      }

      const wallet = req.wallet;
      const { destination_address, ...options } = matchedData(req, { locations: ['body'] });
      const result = await wallet.consolidateUtxos(destination_address, options);
      res.send({ success: true, ...result });
    } catch(error) {
      res.send({ success: false, error: error.message || error });
    } finally {
      lock.unlock(lockTypes.SEND_TX);
    }
  }
);

/**
 * GET request to obtain adress information
 * For the docs, see api-docs.js
 */
 walletRouter.get(
  '/address-info',
  query('address').isString(),
  query('token').isString().optional(),
  (req, res) => {
    // Query parameters validation
    const validationResult = parametersValidation(req);
    if (!validationResult.success) {
      return res.status(400).json(validationResult);
    }

    const wallet = req.wallet;
    const { address, token } = matchedData(req, { locations: ['query'] });
    try {
      const result = wallet.getAddressInfo(address, { token });
      res.send({
        success: true,
        ...result
      });
    } catch(error) {
      if (error instanceof errors.AddressError) {
        res.send({ success: false, error: error.message });
      } else {
        throw error;
      }
    }
  }
);

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

app.use('/wallet', walletRouter);

console.log('Starting Hathor Wallet...', {
  wallet: version,
  version: process.version,
  platform: process.platform,
  pid: process.pid,
});

console.log('Configuration...', {
  network: config.network,
  server: config.server,
  tokenUid: config.tokenUid,
  apiKey: config.http_api_key,
  gapLimit: config.gapLimit,
  connectionTimeout: config.connectionTimeout,
});

if (config.gapLimit) {
  console.log(`Set GAP LIMIT to ${config.gapLimit}`);
  walletUtils.setGapLimit(config.gapLimit);
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.http_port, config.http_bind_address, () => {
    console.log(`Listening on ${config.http_bind_address}:${config.http_port}...`);
  });
}

export default app;
