/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { ncApi, nanoUtils, bufferUtils, NanoContractSerializer } = require('@hathor/wallet-lib');
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

/**
 * Create a nano contract
 */
async function createNanoContract(req, res) {
  executeNanoContractMethodHelper(req, res, true);
}

/**
 * Execute a method of a nano contract that already exists
 */
async function executeNanoContractMethod(req, res) {
  executeNanoContractMethodHelper(req, res, false);
}

/**
 * Helper method to build nano contract transaction
 */
async function executeNanoContractMethodHelper(req, res, isInitialize) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const canStart = lock.lock(lockTypes.SEND_TX);
  if (!canStart) {
    // TODO: return status code 423
    // we should do this refactor in the future for all APIs
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { wallet } = req;
  const { blueprint_id: blueprintId, nc_id: ncId, address, data } = req.body;
  const method = isInitialize ? 'initialize' : req.body.method;

  // Set blueprint id or nc id to the data execution
  if (isInitialize) {
    data.blueprintId = blueprintId;
  } else {
    data.ncId = ncId;
  }

  try {
    const response = await wallet.createAndSendNanoContractTransaction(
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

/**
 * Method to get oracle data from a string (it might be an address or the oracle data itself in hex)
 */
function getOracleData(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { oracle } = req.query;
  const { wallet } = req;

  try {
    const oracleData = nanoUtils.getOracleBuffer(oracle, wallet.getNetworkObject());

    res.send({
      success: true,
      oracleData: bufferUtils.bufferToHex(oracleData),
    });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

/**
 * Get the argument of a result signed by an oracle
 */
async function getOracleSignedResult(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { result, type, oracle_data: oracleData } = req.query;
  const { wallet } = req;

  try {
    let resultToSerialize = result;
    if (type === 'bytes') {
      // If type is bytes, then the result comes in hex
      resultToSerialize = bufferUtils.hexToBuffer(result);
    }

    const nanoSerializer = new NanoContractSerializer();
    const resultSerialized = nanoSerializer.serializeFromType(resultToSerialize, type);

    const oracleDataBuffer = bufferUtils.hexToBuffer(oracleData);
    const inputData = await nanoUtils.getOracleInputData(
      oracleDataBuffer,
      resultSerialized,
      wallet
    );

    const signedResult = `${bufferUtils.bufferToHex(inputData)},${result},${type}`;

    res.send({
      success: true,
      signedResult,
    });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

module.exports = {
  getState,
  getHistory,
  createNanoContract,
  executeNanoContractMethod,
  getOracleData,
  getOracleSignedResult,
};
