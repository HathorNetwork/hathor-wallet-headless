/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// import is used because there is an issue with winston logger when using require ref: #262
import logger from '../../logger'; // eslint-disable-line import/no-import-module-exports

const { txApi, walletApi, constants: hathorLibConstants, helpersUtils, errors, tokensUtils, PartialTx } = require('@hathor/wallet-lib');
const { matchedData } = require('express-validator');
const { parametersValidation } = require('../../helpers/validations.helper');
const { lock, lockTypes } = require('../../lock');
const { cantSendTxErrorMessage, friendlyWalletState } = require('../../helpers/constants');
const { mapTxReturn, prepareTxFunds } = require('../../helpers/tx.helper');
const { initializedWallets } = require('../../services/wallets.service');
const { removeAllWalletProposals } = require('../../services/atomic-swap.service');

function getStatus(req, res) {
  const { wallet } = req;
  const data = {
    statusCode: wallet.state,
    statusMessage: friendlyWalletState[wallet.state],
    network: wallet.getNetwork(),
    serverUrl: wallet.getServerUrl(),
    serverInfo: wallet.serverInfo,
  };
  if (wallet.multisig) {
    data.multisig = {
      numSignatures: wallet.multisig.numSignatures,
      totalParticipants: wallet.multisig.pubkeys.length,
    };
  }
  res.send(data);
}

async function getBalance(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  const { wallet } = req;
  // Expects token uid
  const token = req.query.token || hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;
  const balanceObj = await wallet.getBalance(token);
  res.send({ available: balanceObj[0].balance.unlocked, locked: balanceObj[0].balance.locked });
}

function getAddress(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  const { wallet } = req;
  const { index } = req.query;
  let address;
  if (index !== undefined) {
    // Because of isInt and toInt, it's safe to assume that index is now an integer >= 0
    address = wallet.getAddressAtIndex(index);
  } else {
    const markAsUsed = req.query.mark_as_used || false;
    const addressInfo = wallet.getCurrentAddress({ markAsUsed });
    address = addressInfo.address;
  }
  res.send({ address });
}

function getAddressIndex(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  const { wallet } = req;
  const { address } = req.query;
  const index = wallet.getAddressIndex(address);
  if (index === null) {
    // Address does not belong to the wallet
    res.send({ success: false });
  } else {
    res.send({ success: true, index });
  }
}

function getAddressInfo(req, res) {
  // Query parameters validation
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { wallet } = req;
  const { address, token } = matchedData(req, { locations: ['query'] });
  try {
    const result = wallet.getAddressInfo(address, { token });
    res.send({
      success: true,
      ...result
    });
  } catch (error) {
    if (error instanceof errors.AddressError) {
      res.send({ success: false, error: error.message });
    } else {
      throw error;
    }
  }
}

async function getAddresses(req, res) {
  const { wallet } = req;
  // TODO Add pagination
  const addresses = [];
  const iterator = wallet.getAllAddresses();

  // TODO: Refactor with a `while`?
  for (;;) {
    const addressObj = await iterator.next();
    const { value, done } = addressObj;

    if (done) {
      break;
    }

    addresses.push(value.address);
  }
  res.send({ addresses });
}

function getTxHistory(req, res) {
  // TODO Add pagination
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  const { wallet } = req;
  const limit = req.query.limit || null;
  const history = wallet.getFullHistory();
  if (limit) {
    const values = Object.values(history);
    const sortedValues = values.sort((a, b) => b.timestamp - a.timestamp);
    res.send(sortedValues.slice(0, limit));
  } else {
    res.send(Object.values(history));
  }
}

function getTransaction(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  const { wallet } = req;
  const { id } = req.query;
  const tx = wallet.getTx(id);
  if (tx) {
    res.send(tx);
  } else {
    res.send({ success: false, error: `Wallet does not contain transaction with id ${id}` });
  }
}

async function getTxConfirmationBlocks(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { wallet } = req;
  const { id } = req.query;
  // This is O(1) operation, so we can use it to check if this tx belongs to the wallet
  const tx = wallet.getTx(id);
  if (!tx) {
    // We allow only to get data for transactions from the wallet
    res.send({ success: false, error: `Wallet does not contain transaction with id ${id}` });
    return;
  }

  // First get transaction data from full node

  // Disabling this eslint rule because of the way API call is done in the lib
  // otherwise the code would need to be more complex
  // We should change this when we refactor the way we call APIs in the lib
  // (this comment also applies for the getMiningInfo call)
  // eslint-disable-next-line no-promise-executor-return
  const txDataResponse = await new Promise(resolve => txApi.getTransaction(id, resolve));

  if (!txDataResponse.success) {
    res.send({ success: false, error: 'Failed to get transaction data from the full node.' });
    return;
  }

  // Now we get the current height of the network
  // eslint-disable-next-line no-promise-executor-return
  const networkHeightResponse = await new Promise(resolve => walletApi.getMiningInfo(resolve));

  if (!networkHeightResponse.success) {
    res.send({ success: false, error: 'Failed to get network heigth from the full node.' });
    return;
  }

  let confirmationNumber = 0;

  // first_block_height will be null until a block confirms this transaction
  if (txDataResponse.meta && txDataResponse.meta.first_block_height) {
    confirmationNumber = networkHeightResponse.blocks - txDataResponse.meta.first_block_height;
  }

  res.send({ success: true, confirmationNumber });
}

async function simpleSendTx(req, res) {
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
  const { address, value, token } = req.body;
  let tokenId;
  if (token) {
    if (typeof token === 'string') {
      tokenId = token;
    } else {
      tokenId = token.uid;
    }
  } else {
    tokenId = hathorLibConstants.HATHOR_TOKEN_CONFIG.uid;
  }
  const changeAddress = req.body.change_address || null;
  try {
    const response = await wallet.sendTransaction(
      address,
      value,
      { token: tokenId, changeAddress }
    );
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function decodeTx(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const txHex = req.body.txHex || null;
  const partialTx = req.body.partial_tx || null;

  if (txHex && partialTx) {
    res.status(400).json({
      success: false,
      error: 'Required only one of txHex or partialTx',
    });
    return;
  }

  try {
    let tx;
    if (txHex !== null) {
      tx = helpersUtils.createTxFromHex(txHex, req.wallet.getNetworkObject());
    } else {
      const partial = PartialTx.deserialize(partialTx, req.wallet.getNetworkObject());
      // Validate will check with the fullnode if the partial-tx inputs exists and are valid
      const valid = await partial.validate();
      if (!valid) {
        throw new Error('Partial transaction inconsistent with backend');
      }
      tx = partial.getTx();
    }
    const data = {
      tokens: tx.tokens,
      inputs: tx.inputs.map(input => ({ txId: input.hash, index: input.index })),
      outputs: [],
    };
    for (const output of tx.outputs) {
      output.parseScript(req.wallet.getNetworkObject());
      const outputData = {
        value: output.value,
        tokenData: output.tokenData,
        script: output.script.toString('base64'),
        type: output.decodedScript.getType(),
        decoded: output.decodedScript,
      };
      if (output.tokenData !== 0) {
        outputData.token = tx.tokens[output.getTokenIndex()];
      }
      switch (outputData.type) {
        case 'data':
          outputData.decoded = {
            data: output.decodedScript.data,
          };
          break;
        case 'p2sh':
        case 'p2pkh':
        default:
          outputData.decoded = {
            address: output.decodedScript.address.base58,
            timelock: output.decodedScript.timelock,
          };
      }
      data.outputs.push(outputData);
    }
    res.send({ success: true, tx: data });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function sendTx(req, res) {
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

  const preparedFundsResponse = prepareTxFunds(
    wallet,
    req.body.outputs,
    req.body.inputs || [],
    (req.body.token && req.body.token.uid) || hathorLibConstants.HATHOR_TOKEN_CONFIG.uid,
  );
  if (!preparedFundsResponse.success) {
    lock.unlock(lockTypes.SEND_TX);
    res.send(preparedFundsResponse);
    return;
  }

  const { inputs, outputs } = preparedFundsResponse;
  const changeAddress = req.body.change_address || null;
  const debug = req.body.debug || false;
  if (debug) {
    wallet.enableDebugMode();
  }

  try {
    const response = await wallet.sendManyOutputsTransaction(outputs, { inputs, changeAddress });
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    const ret = { success: false, error: err.message };
    if (debug) {
      logger.debug('/send-tx failed', {
        body: JSON.stringify(req.body),
        response: JSON.stringify(ret),
      });
    }
    res.send(ret);
  } finally {
    if (debug) {
      wallet.disableDebugMode();
    }
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function createToken(req, res) {
  // TODO: Unify common code with create-nft
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
  const { name, symbol, amount } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  try {
    const response = await wallet.createNewToken(name, symbol, amount, { changeAddress, address });
    const configurationString = tokensUtils.getConfigurationString(
      response.hash,
      response.name,
      response.symbol
    );
    res.send({ success: true, configurationString, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function mintTokens(req, res) {
  // Unify common code with melt-tokens
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
  const { token, amount } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  try {
    const response = await wallet.mintTokens(token, amount, { address, changeAddress });
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function meltTokens(req, res) {
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
  const { token, amount } = req.body;
  const changeAddress = req.body.change_address || null;
  const depositAddress = req.body.deposit_address || null;
  try {
    const response = await wallet.meltTokens(
      token,
      amount,
      { address: depositAddress, changeAddress }
    );
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

function utxoFilter(req, res) {
  try {
    const validationResult = parametersValidation(req);
    if (!validationResult.success) {
      res.status(400).json(validationResult);
      return;
    }

    const { wallet } = req;
    const options = matchedData(req, { locations: ['query'] });

    // TODO Memory usage enhancements are required here as wallet.getUtxos can cause issues on
    //  wallets with a huge amount of utxos.
    // TODO Add pagination
    const ret = wallet.getUtxos(options);
    res.send(ret);
  } catch (error) {
    res.send({ success: false, error: error.message || error });
  }
}

async function utxoConsolidation(req, res) {
  // Body parameters validation
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
  const { destination_address: destinationAddress, ...options } = matchedData(req, { locations: ['body'] });

  try {
    const response = await wallet.consolidateUtxos(destinationAddress, options);
    res.send({ success: true, ...response });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function createNft(req, res) {
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
  const { name, symbol, amount, data } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const createMint = req.body.create_mint || false;
  const createMelt = req.body.create_melt || false;
  try {
    const response = await wallet.createNFT(
      name,
      symbol,
      amount,
      data,
      { address, changeAddress, createMint, createMelt }
    );
    const configurationString = tokensUtils.getConfigurationString(
      response.hash,
      response.name,
      response.symbol
    );
    res.send({ success: true, configurationString, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

async function stop(req, res) {
  // Stop wallet and remove from wallets object
  const { wallet } = req;
  wallet.stop();

  initializedWallets.delete(req.walletId);
  await removeAllWalletProposals(req.walletId);
  res.send({ success: true });
}

module.exports = {
  getStatus,
  getBalance,
  getAddress,
  getAddressIndex,
  getAddresses,
  getAddressInfo,
  getTxHistory,
  getTransaction,
  getTxConfirmationBlocks,
  simpleSendTx,
  decodeTx,
  sendTx,
  createToken,
  mintTokens,
  meltTokens,
  utxoFilter,
  utxoConsolidation,
  createNft,
  stop,
};
