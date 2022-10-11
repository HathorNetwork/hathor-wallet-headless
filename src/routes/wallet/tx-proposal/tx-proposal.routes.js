/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const { checkSchema, oneOf } = require('express-validator');
const {
  buildTxProposal,
  addSignatures,
  pushTxHex,
} = require('../../../controllers/wallet/tx-proposal/tx-proposal.controller');
const { txBuildSchema, queryInputSchema, txInputSchema, txHexSchema, txHexInputDataSchema } = require('../../../schemas');

const txProposalRouter = Router({ mergeParams: true });

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

txProposalRouter.post(
  '/push-tx',
  checkSchema(txHexSchema),
  pushTxHex,
);

module.exports = txProposalRouter;
