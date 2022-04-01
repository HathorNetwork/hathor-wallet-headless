const { Router } = require('express');
const app = require('../index');
const rootControllers = require('../controllers/index.controllers')

const mainRouter = Router({mergeParams: true});

function fake(req, res, next) {}

app.get('/', rootControllers.welcome);
app.get('/docs', rootControllers.docs);
app.get('/start', rootControllers.start);
app.get('/multisig-pubkey', rootControllers.multisigPubkey);
app.use('/wallet', 'walletRouter');
app.use('/tx-proposal', 'txProposalRouter');

module.exports = mainRouter;
