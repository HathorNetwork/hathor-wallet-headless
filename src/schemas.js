/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
  },
  'signatures.*': {
    in: ['body'],
    errorMessage: 'Invalid signature',
    isString: true,
  },
};

export const atomicSwapCreateSchema = {
  'send.utxos': {
    in: ['body'],
    errorMessage: 'Invalid utxos array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'send.utxos.*.txId': {
    in: ['body'],
    errorMessage: 'Invalid utxo txId',
    isString: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if txId is a 64 character hex string
        if (!(/^[0-9a-fA-F]{64}$/.test(value))) return false;
        return true;
      }
    },
  },
  'send.utxos.*.index': {
    in: ['body'],
    errorMessage: 'Invalid utxo index',
    isInt: {
      options: {
        min: 0,
      },
    },
    toInt: true,
  },
  'send.tokens': {
    in: ['body'],
    errorMessage: 'Invalid send.tokens array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'send.tokens.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
  },
  'send.tokens.*.value': {
    in: ['body'],
    errorMessage: 'Invalid value',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
  },
  'receive.tokens': {
    in: ['body'],
    errorMessage: 'Invalid receive.tokens array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  'receive.tokens.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
  },
  'receive.tokens.*.value': {
    in: ['body'],
    errorMessage: 'Invalid value',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
  },
  'receive.tokens.*.timelock': {
    in: ['body'],
    errorMessage: 'Invalid timelock',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
    optional: true,
  },
  'receive.tokens.*.address': {
    in: ['body'],
    errorMessage: 'Invalid address',
    isString: true,
    optional: true,
  },
  partial_tx: {
    in: ['body'],
    errorMessage: 'Invalid partial tx',
    isString: true,
    optional: true,
  },
  lock: {
    in: ['body'],
    errorMessage: 'Invalid lock argument',
    isBoolean: true,
    optional: true,
  },
  change_address: {
    in: ['body'],
    errorMessage: 'Invalid change address',
    isString: true,
    optional: true,
  },
};

export const txBuildSchema = {
  outputs: {
    in: ['body'],
    errorMessage: 'Invalid outputs array',
    isArray: true,
    notEmpty: true,
    optional: false,
  },
  'outputs.*.address': {
    in: ['body'],
    errorMessage: 'Invalid address',
    isString: true,
    optional: true,
  },
  'outputs.*.value': {
    in: ['body'],
    errorMessage: 'Invalid value',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
    optional: true,
  },
  'outputs.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if token uid is a 64 character hex string or 00
        if (!(/^(00|[0-9a-fA-F]{64})$/.test(value))) return false;
        return true;
      }
    },
  },
  'outputs.*': {
    in: ['body'],
    isObject: true,
    custom: {
      options: (value, { req, location, path }) => {
        if ('type' in value && value.type === 'data') {
          if ('data' in value && !('token' in value)) {
            return (/^[0-9a-fA-F]+$/.test(value.data));
          }
          return false;
        }
        // This is an address output
        // Check that we have all params
        return ('address' in value && 'value' in value);
      },
    },
  },
  inputs: {
    in: ['body'],
    errorMessage: 'Invalid inputs array',
    isArray: true,
    notEmpty: true,
    optional: true,
  },
  change_address: {
    in: ['body'],
    errorMessage: 'Invalid change address',
    isString: true,
    optional: true,
  },
};

export const txInputSchema = {
  'inputs.*.hash': {
    in: ['body'],
    errorMessage: 'Invalid hash',
    isString: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if hash is a 64 character hex string
        if (!(/^[0-9a-fA-F]{64}$/.test(value))) return false;
        return true;
      }
    },
  },
  'inputs.*.index': {
    in: ['body'],
    errorMessage: 'Invalid index',
    isInt: {
      options: {
        min: 0,
      },
    },
    toInt: true,
  },
};

export const queryInputSchema = {
  inputs: {
    in: ['body'],
    errorMessage: 'Invalid inputs array',
    isArray: true,
    isLength: 1,
    notEmpty: true,
  },
  'inputs.*.type': {
    in: ['body'],
    errorMessage: 'Invalid type',
    isString: true,
    equals: {
      options: 'query',
    },
  },
  'inputs.*.max_utxos': {
    in: ['body'],
    errorMessage: 'Invalid max_utxos',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
    optional: true,
  },
  'inputs.*.filter_address': {
    in: ['body'],
    errorMessage: 'Invalid filter_address',
    isString: true,
    optional: true,
  },
  'inputs.*.amount_smaller_than': {
    in: ['body'],
    errorMessage: 'Invalid amount_smaller_than',
    isInt: {
      options: {
        min: 2,
      },
    },
    toInt: true,
    optional: true,
  },
  'inputs.*.amount_bigger_than': {
    in: ['body'],
    errorMessage: 'Invalid amount_bigger_than',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
    optional: true,
  },
  'inputs.*.maximum_amount': {
    in: ['body'],
    errorMessage: 'Invalid maximum_amount',
    isInt: {
      options: {
        min: 1,
      },
    },
    toInt: true,
    optional: true,
  },
};

export const txHexInputDataSchema = {
  ...txHexSchema,
  signatures: {
    in: ['body'],
    errorMessage: 'Invalid signatures',
    isArray: true,
    isEmpty: false,
  },
  'signatures.*.index': {
    in: ['body'],
    errorMessage: 'Invalid signature input index',
    isInt: {
      options: {
        min: 0,
      },
    },
    toInt: true,
  },
  'signatures.*.data': {
    in: ['body'],
    errorMessage: 'Invalid signature data',
    isString: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if data is a hex string
        if (!(/^[0-9a-fA-F]+$/.test(value))) return false;
        return true;
      }
    },
  },
};
