/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { constants: { HATHOR_TOKEN_CONFIG } } = require('@hathor/wallet-lib');

export const txHexSchema = {
  txHex: {
    in: ['body'],
    errorMessage: 'Invalid txHex',
    isString: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if txHex is actually hex
        if (!(/^[0-9a-fA-F]+$/.test(value))) return false;
        return true;
      }
    },
  }
};

export const partialTxSchema = {
  partial_tx: {
    in: ['body'],
    errorMessage: 'Invalid partial tx',
    isString: true,
  }
};

export const txHexSignatureSchema = {
  ...txHexSchema,
  signatures: {
    in: ['body'],
    errorMessage: 'Invalid signatures array',
    isArray: true,
    notEmpty: true,
  },
  'signatures.*': {
    in: ['body'],
    errorMessage: 'Invalid signature',
    isString: true,
  },
};

export const partialTxSignatureSchema = {
  ...partialTxSchema,
  signatures: {
    in: ['body'],
    errorMessage: 'Invalid signatures array',
    isArray: true,
    notEmpty: true,
    optional: true,
    default: null,
  },
  'signatures.*': {
    in: ['body'],
    errorMessage: 'Invalid signature',
    isString: true,
  },
};

export const partialTxOrTxHexSchema = {
  txHex: {
    ...txHexSchema.txHex,
    optional: true,
  },
  partialTx: {
    ...partialTxSchema.partialTx,
    optional: true,
  },
};

export const atomicSwapCreateSchema = {
  outputs: {
    in: ['body'],
    errorMessage: 'Invalid outputs array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'outputs.*.address': {
    in: ['body'],
    errorMessage: 'Invalid output address',
    isString: true,
  },
  'outputs.*.value': {
    in: ['body'],
    errorMessage: 'Invalid output value',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
  },
  'outputs.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
    default: HATHOR_TOKEN_CONFIG.uid,
  },
  'outputs.*.timelock': {
    in: ['body'],
    errorMessage: 'Invalid timelock',
    isInt: true,
    toInt: true,
    optional: true,
    default: null,
  },
  inputs: {
    in: ['body'],
    errorMessage: 'Invalid inputs array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'inputs.*.txId': {
    in: ['body'],
    errorMessage: 'Invalid input txId',
    isString: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if txId is a 64 character hex string
        if (!(/^[0-9a-fA-F]{64}$/.test(value))) return false;
        return true;
      }
    },
  },
  'inputs.*.index': {
    in: ['body'],
    errorMessage: 'Invalid input index',
    isInt: true,
    toInt: true,
  },
  'inputs.*.value': {
    in: ['body'],
    errorMessage: 'Invalid input value',
    isInt: true,
    toInt: true,
  },
  'inputs.*.token': {
    in: ['body'],
    errorMessage: 'Invalid input token',
    isString: true,
    optional: true,
    default: HATHOR_TOKEN_CONFIG.uid,
  },
  send_tokens: {
    in: ['body'],
    errorMessage: 'Invalid send_tokens array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'send_tokens.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
    default: HATHOR_TOKEN_CONFIG.uid,
  },
  'send_tokens.*.value': {
    in: ['body'],
    errorMessage: 'Invalid value',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
  },
  receive_tokens: {
    in: ['body'],
    errorMessage: 'Invalid receive_tokens array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'receive_tokens.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
    default: HATHOR_TOKEN_CONFIG.uid,
  },
  'receive_tokens.*.value': {
    in: ['body'],
    errorMessage: 'Invalid value',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
  },
  'receive_tokens.*.timelock': {
    in: ['body'],
    errorMessage: 'Invalid timelock',
    isInt: true,
    toInt: true,
    optional: true,
    default: null,
  },
  'receive_tokens.*.address': {
    in: ['body'],
    errorMessage: 'Invalid address',
    isString: true,
    optional: true,
    default: null,
  },
  partial_tx: {
    in: ['body'],
    errorMessage: 'Invalid partial tx',
    isString: true,
    optional: true,
    default: null
  },
  lock: {
    in: ['body'],
    errorMessage: 'Invalid lock argument',
    isBoolean: true,
    optional: true,
    default: true,
  },
  change_address: {
    in: ['body'],
    errorMessage: 'Invalid change address',
    isString: true,
    optional: true,
  },
};
