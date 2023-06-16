/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { checkSchema, body } = require('express-validator');
const {
  buildTxProposal,
  buildCreateTokenTxProposal,
  getMySignatures,
  signTx,
  signAndPush,
} = require('../../../controllers/wallet/p2sh/tx-proposal.controller');

const txProposalRouter = Router({ mergeParams: true });

txProposalRouter.post(
  '/',
  checkSchema({
    outputs: {
      in: ['body'],
      errorMessage: 'Invalid outputs array',
      isArray: true,
      notEmpty: true,
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
      errorMessage: 'Invalid input value',
      isInt: true,
      toInt: true,
    },
    change_address: {
      in: ['body'],
      errorMessage: 'Invalid change address',
      isString: true,
      optional: true,
    },
  }),
  buildTxProposal,
);

txProposalRouter.post(
  '/create-token',
  body('name').isString().notEmpty(),
  body('symbol').isString().notEmpty(),
  body('amount').isInt({ min: 1 }).toInt(),
  body('address').isString().notEmpty().optional(),
  body('change_address').isString().notEmpty().optional(),
  body('create_mint').isBoolean().optional(),
  body('mint_authority_address').isString().notEmpty().optional(),
  body('allow_external_mint_authority_address').isBoolean().optional().toBoolean(),
  body('create_melt').isBoolean().optional(),
  body('melt_authority_address').isString().notEmpty().optional(),
  body('allow_external_melt_authority_address').isBoolean().optional().toBoolean(),
  buildCreateTokenTxProposal,
);

/*
 * XXX: Currently only works for P2SH MultiSig signatures, but can be enhanced to
 * include P2PKH Signatures once the wallet-lib adds support.
 */
txProposalRouter.post(
  '/get-my-signatures',
  checkSchema({
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
    },
  }),
  getMySignatures,
);

const txHexSignatureSchema = {
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
  },
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

txProposalRouter.post(
  '/sign',
  checkSchema(txHexSignatureSchema),
  signTx,
);

txProposalRouter.post(
  '/sign-and-push',
  checkSchema(txHexSignatureSchema),
  signAndPush,
);

module.exports = txProposalRouter;
