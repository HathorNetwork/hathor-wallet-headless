/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { INanoContractActionSchema, walletUtils } from '@hathor/wallet-lib';
import { bigIntCoercibleSchema, parseSchema } from '@hathor/wallet-lib/lib/utils/bigint';
import { z } from 'zod';

const validator = require('validator');
const { MAX_DATA_SCRIPT_LENGTH } = require('./constants');

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

export const proposalRegisterSchema = {
  password: {
    in: ['body'],
    errorMessage: 'Invalid password',
    isString: true,
    custom: {
      options: (value, { req, location, path }) => {
        // Test if the password has at least 3 characters
        if (!(/^.{3,}$/.test(value))) return false;
        return true;
      }
    },
  },
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

export const partialTxSignatureSchemaWithService = {
  ...partialTxSignatureSchema,
  'service.proposal_id': {
    in: ['body'],
    errorMessage: 'Invalid proposal id',
    isString: true,
    optional: true,
  },
  'service.version': {
    in: ['body'],
    errorMessage: 'Invalid version number',
    isInt: {
      options: {
        min: 0,
      },
    },
    optional: true,
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
      // Test if txId is a 64 character hex string
      options: value => (/^[0-9a-fA-F]{64}$/.test(value)),
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
    custom: {
      options: bigIntValidator({ min: 1 }),
    },
    customSanitizer: {
      options: bigIntSanitizer,
    },
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
    custom: {
      options: bigIntValidator({ min: 1 }),
    },
    customSanitizer: {
      options: bigIntSanitizer,
    },
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
  // Below, parameters that deal with the Atomic Swap Service
  'service.is_new': {
    in: ['body'],
    errorMessage: 'Invalid is_new argument',
    isBoolean: true,
    optional: true,
  },
  'service.proposal_id': {
    in: ['body'],
    errorMessage: 'Invalid proposal id',
    isString: true,
    optional: true,
  },
  'service.password': {
    in: ['body'],
    errorMessage: 'Invalid password',
    isString: true,
    optional: true,
  },
  'service.version': {
    in: ['body'],
    errorMessage: 'Invalid version number',
    isInt: {
      options: {
        min: 0,
      },
    },
    optional: true,
  }
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
    custom: {
      options: bigIntValidator({ min: 1 }),
    },
    optional: true,
    customSanitizer: {
      options: bigIntSanitizer,
    },
  },
  'outputs.*.token': {
    in: ['body'],
    errorMessage: 'Invalid token uid',
    isString: true,
    optional: true,
    custom: {
      // Test if token uid is a 64 character hex string or 00
      options: value => /^(00|[0-9a-fA-F]{64})$/.test(value),
    },
  },
  'outputs.*': {
    in: ['body'],
    isObject: true,
    custom: {
      options: value => {
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
      // Test if hash is a 64 character hex string
      options: value => /^[0-9a-fA-F]{64}$/.test(value),
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
    custom: {
      options: bigIntValidator({ min: 2 }),
    },
    customSanitizer: {
      options: bigIntSanitizer,
    },
    optional: true,
  },
  'inputs.*.amount_bigger_than': {
    in: ['body'],
    errorMessage: 'Invalid amount_bigger_than',
    custom: {
      options: bigIntValidator({ min: 1 }),
    },
    customSanitizer: {
      options: bigIntSanitizer,
    },
    optional: true,
  },
  'inputs.*.maximum_amount': {
    in: ['body'],
    errorMessage: 'Invalid maximum_amount',
    custom: {
      options: bigIntValidator({ min: 1 }),
    },
    optional: true,
    customSanitizer: {
      options: bigIntSanitizer,
    },
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
      options: value => /^[0-9a-fA-F]+$/.test(value),
    },
  },
};

export const p2pkhSignature = {
  index: {
    in: ['body'],
    errorMessage: 'Invalid index',
    isInt: {
      options: {
        min: 0,
      },
    },
    toInt: true,
  },
  signature: {
    in: ['body'],
    errorMessage: 'Invalid signatures',
    isString: true,
    custom: {
      options: value => /^[0-9a-fA-F]+$/.test(value)
    },
  },
  type: {
    customSanitizer: {
      options: () => 'p2pkh',
    }
  },
};

export const p2shSignature = {
  index: {
    in: ['body'],
    errorMessage: 'Invalid index',
    isInt: {
      options: {
        min: 0,
      },
    },
    toInt: true,
  },
  signatures: {
    in: ['body'],
    errorMessage: 'Invalid signature',
    isObject: true,
    custom: {
      options: value => {
        for (const [xpub, signature] of Object.entries(value)) {
          // values should be hex strings and keys should be valid xpubs
          if (!(/^[0-9a-fA-F]+$/.test(signature)
            && walletUtils.isXpubKeyValid(xpub))) return false;
        }
        return true;
      }
    },
  },
  type: {
    customSanitizer: {
      options: () => 'p2sh',
    }
  },
};

export const createTokenBaseRaw = z.object({
  name: z.string(),
  symbol: z.string(),
  amount: bigIntCoercibleSchema,
  change_address: z.string().nullable().default(null),
  create_mint: z.boolean().default(true),
  mint_authority_address: z.string().nullable().default(null),
  allow_external_mint_authority_address: z.boolean().default(false),
  create_melt: z.boolean().default(true),
  melt_authority_address: z.string().nullable().default(null),
  allow_external_melt_authority_address: z.boolean().default(false),
  data: z.array(z.string().max(MAX_DATA_SCRIPT_LENGTH)).nullable().default(null),
});

const transformCreateTokenBase = data => ({
  ...data,
  changeAddress: data.change_address,
  createMint: data.create_mint,
  mintAuthorityAddress: data.mint_authority_address,
  allowExternalMintAuthorityAddress: data.allow_external_mint_authority_address,
  createMelt: data.create_melt,
  meltAuthorityAddress: data.melt_authority_address,
  allowExternalMeltAuthorityAddress: data.allow_external_melt_authority_address,
});

export const createTokenOptions = createTokenBaseRaw.extend({
  address: z.string().nullable().default(null),
}).transform(data => {
  if (!data || typeof data !== 'object') return {};

  return transformCreateTokenBase(data);
});

export const nanoCreateTokenOptions = z.object({
  create_token_options: createTokenBaseRaw.extend({
    contract_pays_deposit: z.boolean(),
    mint_address: z.string().nullable().default(null),
    is_create_nft: z.boolean().default(false),
  }).optional().transform(data => {
    if (!data || typeof data !== 'object') return undefined;
    const base = transformCreateTokenBase(data);
    return {
      ...base,
      contractPaysTokenDeposit: data.contract_pays_deposit,
      mintAddress: data.mint_address,
      isCreateNFT: data.is_create_nft,
    };
  }),
});

export const nanoContractData = z.object({
  data: z.object({
    args: z.array(z.any()).optional(),
    actions: INanoContractActionSchema.array().default([]),
  }),
});

export const nanoContractCreateData = z.object({
  blueprint_id: z.string(),
  address: z.string(),
}).merge(nanoContractData).merge(nanoCreateTokenOptions);

export const nanoContractExecuteData = z.object({
  nc_id: z.string(),
  method: z.string(),
  address: z.string(),
}).merge(nanoContractData).merge(nanoCreateTokenOptions);

export function bigIntSanitizer(value) {
  try {
    return value === undefined || value === null
      ? value
      : parseSchema(value, bigIntCoercibleSchema);
  } catch {
    return undefined;
  }
}

/**
 * This function substitutes express-validator's default `isInt` validator, as it doesn't work with
 * BigInts. It uses the exact same underlying validator from the validatorjs package, so it accepts
 * the same kinds of options.
 */
export function bigIntValidator(options) {
  return value => validator.isInt(String(value), options);
}
