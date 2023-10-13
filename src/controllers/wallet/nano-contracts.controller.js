/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { ncApi } = require('@hathor/wallet-lib');
const { parametersValidation } = require('../../helpers/validations.helper');
const { lock, lockTypes } = require('../../lock');
const { cantSendTxErrorMessage } = require('../../helpers/constants');
const { mapTxReturn } = require('../../helpers/tx.helper');

/**
 * Get state fields of a nano contract
 */
async function getState(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { id, fields, balances, calls } = req.query;

  try {
    const state = await ncApi.getNanoContractState(id, fields, balances, calls);

    res.send({
      success: true,
      state
    });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

/**
 * Get history of a nano contract
 */
async function getHistory(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { id, count, after } = req.query;

  try {
    const data = await ncApi.getNanoContractHistory(id, count, after);

    res.send({
      success: true,
      history: data.history
    });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function createNanoContract(req, res) {
  executeNanoContractMethodHelper(req, res, true);
}

async function executeNanoContractMethod(req, res) {
  executeNanoContractMethodHelper(req, res, false);
}

async function executeNanoContractMethodHelper(req, res, isInitialize) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { wallet } = req;
  const { blueprint, address, data } = req.body;
  const method = isInitialize ? 'initialize' : req.body.method;

  try {
    const response = await wallet.createAndSendNanoContractTransaction(
      blueprint,
      method,
      address,
      data
    );
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

module.exports = {
  getState,
  getHistory,
  createNanoContract,
  executeNanoContractMethod,
};
