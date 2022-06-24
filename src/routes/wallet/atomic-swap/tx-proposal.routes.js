/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { checkSchema } = require('express-validator');
const {
  txHexSchema,
  txHexSignatureSchema,
  partialTxSchema,
} = require('../../../schemas');
const {
  buildTxProposal,
  getMySignatures,
  signTx,
  signAndPush,
  unlockInputs,
  getLockedUTXOs,
  getInputData,
} = require('../../../controllers/wallet/atomic-swap/tx-proposal.controller');

const txProposalRouter = Router({ mergeParams: true });

txProposalRouter.post(
  '/',
  checkSchema({
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
      errorMessage: 'Invalid input value',
      isInt: true,
      toInt: true,
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
  }),
  buildTxProposal,
);

txProposalRouter.post(
  '/unlock',
  checkSchema(partialTxSchema),
  unlockInputs,
);

txProposalRouter.get(
  '/get-locked-utxos',
  getLockedUTXOs,
);

/*
 * XXX: Currently only works for P2PKH wallets
 * since signing a tx in a MultiSig wallet requires a process among participants.
 */
txProposalRouter.post(
  '/get-my-signatures',
  checkSchema(txHexSchema),
  getMySignatures,
);

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

txProposalRouter.post(
  '/get-input-data',
  checkSchema(txHexSchema),
  getInputData,
);

module.exports = txProposalRouter;
