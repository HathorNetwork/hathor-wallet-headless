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
  partialTxSignatureSchema,
  partialTxSchema,
  atomicSwapCreateSchema,
  proposalByIdSchema,
} = require('../../../schemas');
const {
  buildTxProposal,
  getMySignatures,
  signTx,
  signAndPush,
  unlockInputs,
  getLockedUTXOs,
  getInputData,
  fetchFromService,
} = require('../../../controllers/wallet/atomic-swap/tx-proposal.controller');

const txProposalRouter = Router({ mergeParams: true });

txProposalRouter.post(
  '/',
  checkSchema(atomicSwapCreateSchema),
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

txProposalRouter.post(
  '/fetch-from-service',
  checkSchema(proposalByIdSchema),
  fetchFromService,
);

/*
 * XXX: Currently only works for P2PKH wallets
 * since signing a tx in a MultiSig wallet requires a process among participants.
 */
txProposalRouter.post(
  '/get-my-signatures',
  checkSchema(partialTxSchema),
  getMySignatures,
);

txProposalRouter.post(
  '/sign',
  checkSchema(partialTxSignatureSchema),
  signTx,
);

txProposalRouter.post(
  '/sign-and-push',
  checkSchema(partialTxSignatureSchema),
  signAndPush,
);

txProposalRouter.post(
  '/get-input-data',
  checkSchema(txHexSchema),
  getInputData,
);

module.exports = txProposalRouter;
