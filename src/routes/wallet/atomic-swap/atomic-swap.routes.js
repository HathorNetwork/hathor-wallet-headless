/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Router } = require('express');
const txProposalRouter = require('./tx-proposal.routes');
const { patchExpressRouter } = require('../../../patch');

const atomicSwapRouter = patchExpressRouter(Router({ mergeParams: true }));
atomicSwapRouter.use('/tx-proposal', txProposalRouter);

module.exports = atomicSwapRouter;
