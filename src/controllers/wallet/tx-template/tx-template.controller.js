/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { SendTransaction, WalletTxTemplateInterpreter, TransactionTemplate } = require('@hathor/wallet-lib');
const { mapTxReturn, runSendTransaction } = require('../../../helpers/tx.helper');
const { lockSendTx } = require('../../../helpers/lock.helper');
const { parametersValidation } = require('../../../helpers/validations.helper');
const { cantSendTxErrorMessage } = require('../../../helpers/constants');
const { DEFAULT_PIN } = require('../../../constants');

/**
 * @typedef {import('@hathor/wallet-lib').HathorWallet} HathorWallet
 * @typedef {import('winston').Logger} Logger
 * @typedef {{ walletId: string, wallet: HathorWallet, logger: Logger }} HathorRequestExtras
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {ExpressRequest & HathorRequestExtras} Request
 * @typedef {import('express').Response} Response
 */

/**
 * Build a transaction from the tx-template and push to the network.
 * @param {Request} req
 * @param {Response} res
 */
async function runTemplate(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const unlock = lockSendTx(req.walletId);
  if (unlock === null) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { wallet, logger } = req;

  try {
    if (req.query.debug) {
      wallet.enableDebugMode();
    }
    // build a transaction and sign it
    const transaction = await wallet.buildTxTemplate(req.body);

    // Use runSendTransaction to release lock after marking utxos.
    const sendTransaction = new SendTransaction({ storage: wallet.storage, transaction });
    const tx = await runSendTransaction(sendTransaction, unlock);

    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    logger.error(err);
    res.send({ success: false, error: err.message });
  } finally {
    wallet.disableDebugMode();
  }
}

/**
 * Build a transaction from the tx-template.
 * @param {Request} req
 * @param {Response} res
 */
async function buildTemplate(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { wallet, logger } = req;
  try {
    if (req.query.debug) {
      wallet.enableDebugMode();
    }
    const transaction = await wallet.buildTxTemplate(req.body, {
      signTx: req.query.sign,
      pinCode: DEFAULT_PIN,
    });

    res.send({ success: true, txHex: transaction.toHex() });
  } catch (err) {
    logger.error(err);
    res.send({ success: false, error: err.message });
  } finally {
    wallet.disableDebugMode();
  }
}

module.exports = {
  runTemplate,
  buildTemplate,
};
