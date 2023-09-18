/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { checkSchema, oneOf, query } = require('express-validator');
const {
  buildTxProposal,
  addSignatures,
  getWalletInputs,
  getInputData,
} = require('../../../controllers/wallet/tx-proposal/tx-proposal.controller');
const { txBuildSchema, queryInputSchema, txInputSchema, txHexInputDataSchema, p2pkhSignature, p2shSignature } = require('../../../schemas');
const { patchExpressRouter } = require('../../../patch');

const txProposalRouter = patchExpressRouter(Router({ mergeParams: true }));

txProposalRouter.post(
  '/',
  // Body and outputs validaion
  checkSchema(txBuildSchema),
  // inputs validationn
  oneOf([
    checkSchema(queryInputSchema),
    checkSchema(txInputSchema),
  ]),
  buildTxProposal,
);

txProposalRouter.post(
  '/add-signatures',
  checkSchema(txHexInputDataSchema),
  addSignatures,
);

/**
 * GET request to fetch which of the tx inputs are from the wallet.
 * For the docs, see api-docs.js
 */
txProposalRouter.get(
  '/get-wallet-inputs',
  // check txHex is an actual hex
  query('txHex').isString().custom(value => /^[0-9a-fA-F]+$/.test(value)),
  getWalletInputs
);

/**
 * POST request to convert raw signatures into input data.
 * For the docs, see api-docs.js
 */
txProposalRouter.post(
  '/input-data',
  oneOf([checkSchema(p2pkhSignature), checkSchema(p2shSignature)]),
  getInputData,
);

module.exports = txProposalRouter;
