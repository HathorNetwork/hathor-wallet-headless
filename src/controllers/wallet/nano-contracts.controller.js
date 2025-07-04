/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { ncApi, nanoUtils, bufferUtils } = require('@hathor/wallet-lib');
const { parametersValidation } = require('../../helpers/validations.helper');
const { mapTxReturn, runSendTransaction } = require('../../helpers/tx.helper');
const { lockSendTx } = require('../../helpers/lock.helper');
const { cantSendTxErrorMessage } = require('../../helpers/constants');

/**
 * Get state fields of a nano contract
 */
async function getState(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const {
    id,
    fields,
    balances,
    calls,
    block_hash: blockHash,
    block_height: blockHeight
  } = req.query;

  try {
    const state = await ncApi.getNanoContractState(
      id,
      fields,
      balances,
      calls,
      blockHash,
      blockHeight
    );

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

  const { id, count, after, before } = req.query;

  try {
    const data = await ncApi.getNanoContractHistory(id, count, after, before);

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

  const unlock = lockSendTx(req.walletId);
  if (unlock === null) {
    // TODO: return status code 423
    // we should do this refactor in the future for all APIs
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { wallet } = req;
  const {
    blueprint_id: blueprintId,
    nc_id: ncId,
    address,
    data,
    create_token_options: createTokenOptions
  } = req.body;
  const method = isInitialize ? 'initialize' : req.body.method;

  // Set blueprint id or nc id to the data execution
  if (isInitialize) {
    data.blueprintId = blueprintId;
  } else {
    data.ncId = ncId;
  }

  try {
    /** @type {import('@hathor/wallet-lib').SendTransaction} */
    let sendTransaction;
    if (createTokenOptions) {
      sendTransaction = await wallet.createNanoContractCreateTokenTransaction(
        method,
        address,
        data,
        createTokenOptions
      );
    } else {
      sendTransaction = await wallet.createNanoContractTransaction(
        method,
        address,
        data
      );
    }
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
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

  const { result, contract_id: contractId, type, oracle_data: oracleData } = req.query;
  const { wallet } = req;

  try {
    let resultPreSerialized = result;
    if (type === 'bytes') {
      // If type is bytes, then the result comes in hex
      resultPreSerialized = bufferUtils.hexToBuffer(result);
    }

    const oracleDataBuffer = bufferUtils.hexToBuffer(oracleData);
    const inputData = await nanoUtils.getOracleSignedDataFromUser(
      oracleDataBuffer,
      contractId,
      `SignedData[${type}]`,
      resultPreSerialized,
      wallet
    );

    res.send({
      success: true,
      signedResult: inputData,
    });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

/**
 * Create an on chain blueprint transaction
 */
async function createOnChainBlueprint(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const unlock = lockSendTx(req.walletId);
  if (unlock === null) {
    // TODO: return status code 423
    // we should do this refactor in the future for all APIs
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { wallet } = req;
  const { code, address } = req.body;

  try {
    /** @type {import('@hathor/wallet-lib').SendTransaction} */
    const sendTransaction = await wallet.createOnChainBlueprintTransaction(code, address);
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
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
  createOnChainBlueprint,
};
