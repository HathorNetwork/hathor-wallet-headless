/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Router } from 'express';
import txProposalRouter from './tx-proposal.routes';

const p2shRouter = Router({ mergeParams: true });
p2shRouter.use('/tx-proposal', txProposalRouter);

module.exports = p2shRouter;
