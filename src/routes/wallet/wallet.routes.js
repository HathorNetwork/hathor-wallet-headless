/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { query, checkSchema, oneOf, body } = require('express-validator');
const { walletMiddleware } = require('../../middlewares/wallet.middleware');
const {
  getStatus, getBalance, getAddress, getAddresses, getTxHistory, getTransaction,
  simpleSendTx, decodeTx, sendTx, createToken, mintTokens, meltTokens, utxoFilter,
  utxoConsolidation, createNft, getAddressInfo, stop,
  getAddressIndex, getTxConfirmationBlocks
} = require('../../controllers/wallet/wallet.controller');
const { txHexSchema, partialTxSchema } = require('../../schemas');
const p2shRouter = require('./p2sh/p2sh.routes');
const atomicSwapRouter = require('./atomic-swap/atomic-swap.routes');
const txProposalRouter = require('./tx-proposal/tx-proposal.routes');
const configRouter = require('./config/config.routes');
const nanoContractRouter = require('./nano-contracts.routes');
const { MAX_DATA_SCRIPT_LENGTH } = require('../../constants');
const { patchExpressRouter } = require('../../patch');

const walletRouter = patchExpressRouter(Router({ mergeParams: true }));
walletRouter.use(walletMiddleware);
walletRouter.use('/atomic-swap', atomicSwapRouter);
walletRouter.use('/p2sh', p2shRouter);
walletRouter.use('/tx-proposal', txProposalRouter);
walletRouter.use('/config', configRouter);
walletRouter.use('/nano-contracts', nanoContractRouter);

/**
 * GET request to get the status of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/status', getStatus);

/**
 * GET request to get the balance of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/balance',
  query('token').isString().optional(),
  getBalance
);

/**
 * GET request to get an address of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/address',
  query('index').isInt({ min: 0 }).optional().toInt(),
  query('mark_as_used').isBoolean().optional().toBoolean(),
  getAddress
);

/**
 * GET request to get an address index
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/address-index',
  query('address').isString(),
  getAddressIndex
);

/**
 * GET request to get all addresses of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get('/addresses', getAddresses);

/**
 * GET request to obtain adress information
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/address-info',
  query('address').isString(),
  query('token').isString().optional(),
  getAddressInfo
);

/**
 * GET request to get the transaction history of a wallet
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/tx-history',
  query('limit').isInt().optional().toInt(),
  getTxHistory
);

/**
 * GET request to get a transaction from the wallet
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/transaction',
  query('id').isString(),
  getTransaction
);

/**
 * GET request to get the number of blocks confirming this tx
 * For the docs, see api-docs.js
 */
walletRouter.get(
  '/tx-confirmation-blocks',
  query('id').isString(),
  getTxConfirmationBlocks
);

/**
 * POST request to send a transaction with only one output
 * For the docs, see api-docs.js
 *
 * For this API we use checkSchema for parameter validation because we have
 * objects that are optionals. For those objects, there is no easy way to validate saying that
 * the objects is optional but if presented, the fields on it must be required.
 * To achieve this validation we must create a custom validator.
 */
walletRouter.post(
  '/simple-send-tx',
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
    change_address: {
      in: ['body'],
      isString: true,
      optional: true
    },
    token: {
      in: ['body'],
      optional: true,
      custom: {
        options: (value, { req, location, path }) => {
          if (typeof value === 'string') {
            return true;
          } if (typeof value === 'object') {
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
          return false;
        }
      }
    }
  }),
  simpleSendTx
);

walletRouter.post(
  '/decode',
  oneOf([
    checkSchema(txHexSchema),
    checkSchema(partialTxSchema),
  ], 'Required at least one of txHex or partial_tx'),
  decodeTx
);

/**
 * POST request to send a transaction with many outputs and inputs selection
 * For the docs, see api-docs.js
 *
 * For this API we use checkSchema for parameter validation because we have
 * objects that are optionals. For those objects, there is no easy way to validate saying that
 * the objects is optional but if presented, the fields on it must be required.
 * To achieve this validation we must create a custom validator.
 */
walletRouter.post(
  '/send-tx',
  checkSchema({
    outputs: {
      in: ['body'],
      isArray: true,
    },
    'outputs.*.address': {
      in: ['body'],
      isString: true,
      optional: true
    },
    'outputs.*.value': {
      in: ['body'],
      isInt: {
        options: {
          min: 1
        }
      },
      toInt: true,
      optional: true
    },
    'outputs.*.token': {
      in: ['body'],
      isString: true,
      optional: true
    },
    'outputs.*.type': {
      in: ['body'],
      isString: true,
      optional: true
    },
    'outputs.*.data': {
      in: ['body'],
      isString: true,
      isLength: {
        options: {
          max: MAX_DATA_SCRIPT_LENGTH
        }
      },
      optional: true
    },
    'outputs.*.timelock': {
      in: ['body'],
      isInt: {
        options: {
          min: 1
        }
      },
      toInt: true,
      optional: true
    },
    'outputs.*': {
      in: ['body'],
      isObject: true,
      custom: {
        options: (value, { req, location, path }) => {
          if ('type' in value && value.type === 'data') {
            // It's a data script outputs, so we must have a 'data' key
            if (!('data' in value)) {
              return false;
            }

            // User might get into confusion using type data and address/value
            // so I will forbid this
            if ('address' in value || 'value' in value) {
              // Mix of p2pkh/p2sh output with data output
              return false;
            }

            return true;
          }

          // It's a P2PKH or P2SH output, so we must have address and value
          if (!('address' in value) || !('value' in value)) {
            return false;
          }

          return true;
        }
      }
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
          if ('type' in value && value.type === 'query') {
            // It's a query input and all fields are optionals
            return true;
          }
          // It's a normal input
          if (!('hash' in value) || !(typeof value.hash === 'string')) {
            return false;
          }
          if (!('index' in value) || !(/^\d+$/.test(value.index))) {
            // Test that index is required and it's an integer
            return false;
          }
          if (!value.hash) {
            // the regex in value.index already test for empty string
            return false;
          }
          return true;
        }
      },
      customSanitizer: {
        options: value => {
          const sanitizedValue = { ...value, index: parseInt(value.index, 10) };
          return sanitizedValue;
        }
      }
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
    },
    change_address: {
      in: ['body'],
      isString: true,
      optional: true
    },
    debug: {
      in: ['body'],
      isBoolean: true,
      toBoolean: true,
      optional: true,
    }
  }),
  sendTx
);

/**
 * POST request to create a token
 * For the docs, see api-docs.js
 */
walletRouter.post(
  '/create-token',
  body('name').isString(),
  body('symbol').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('address').isString().optional(),
  body('change_address').isString().optional(),
  body('create_mint').isBoolean().optional().toBoolean(),
  body('mint_authority_address').isString().optional(),
  body('allow_external_mint_authority_address').isBoolean().optional().toBoolean(),
  body('create_melt').isBoolean().optional().toBoolean(),
  body('melt_authority_address').isString().optional(),
  body('allow_external_melt_authority_address').isBoolean().optional().toBoolean(),
  body('data').isArray().optional(),
  body('data.*').isString(),
  createToken
);

/**
 * POST request to mint tokens
 * For the docs, see api-docs.js
 */
walletRouter.post(
  '/mint-tokens',
  body('token').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('address').isString().optional(),
  body('change_address').isString().optional(),
  body('mint_authority_address').isString().optional(),
  body('allow_external_mint_authority_address').isBoolean().optional().toBoolean(),
  mintTokens
);

/**
 * POST request to melt tokens
 * For the docs, see api-docs.js
 */
walletRouter.post(
  '/melt-tokens',
  body('token').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('change_address').isString().optional(),
  body('deposit_address').isString().optional(),
  body('melt_authority_address').isString().optional(),
  body('allow_external_melt_authority_address').isBoolean().optional().toBoolean(),
  meltTokens
);

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
  query('only_available_utxos').isBoolean().optional().toBoolean(),
  utxoFilter
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
  utxoConsolidation
);

/**
 * POST request to create an NFT
 * For the docs, see api-docs.js
 */
walletRouter.post(
  '/create-nft',
  body('name').isString(),
  body('symbol').isString(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('data').isString().isLength({ max: MAX_DATA_SCRIPT_LENGTH }),
  body('address').isString().optional(),
  body('change_address').isString().optional(),
  body('create_mint').isBoolean().optional().toBoolean(),
  body('mint_authority_address').isString().optional(),
  body('allow_external_mint_authority_address').isBoolean().optional().toBoolean(),
  body('create_melt').isBoolean().optional().toBoolean(),
  body('melt_authority_address').isString().optional(),
  body('allow_external_melt_authority_address').isBoolean().optional().toBoolean(),
  createNft
);

/**
 * POST request to stop a wallet
 * For the docs, see api-docs.js
 */
walletRouter.post('/stop', stop);

module.exports = walletRouter;
