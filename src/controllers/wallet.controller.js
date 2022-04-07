/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { constants: hathorLibConstants, helpersUtils, errors } = require('@hathor/wallet-lib');
const { matchedData } = require('express-validator');
const { parametersValidation } = require('../helpers/validations.helper');
const { lock, lockTypes } = require('../lock');
const { cantSendTxErrorMessage, friendlyWalletState } = require('../helpers/constants');
const { mapTxReturn, getUtxosToFillTx } = require('../helpers/tx.helper');
const logger = require('../logger');
const { initializedWallets } = require('../services/wallets.service');

function getStatus(req, res) {
  const { wallet } = req;
  res.send({
    statusCode: wallet.state,
    statusMessage: friendlyWalletState[wallet.state],
    network: wallet.getNetwork(),
    serverUrl: wallet.getServerUrl(),
    serverInfo: wallet.serverInfo,
  });
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

  const { txHex } = req.body;
  try {
    const tx = helpersUtils.createTxFromHex(txHex, req.wallet.getNetworkObject());
    const data = {
      tokens: tx.tokens,
      inputs: tx.inputs.map(input => ({ txId: input.hash, index: input.index })),
      outputs: [],
    };
    for (const output of tx.outputs) {
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
  const { outputs } = req.body;

  /**
   * @typedef TokenOutput
   * A structure to help calculate how many tokens will be needed on send-tx's automatic inputs
   * @property {string} tokenUid Hash identification of the token
   * @property {number} amount Amount of tokens necessary on the inputs
   */

  /**
   * Map of tokens on the output that will be needed on the automatic input calculation
   * @type {Map<string, TokenOutput>}
   */
  const tokens = new Map();

  // I tried to use the default schema with express validator to set the default token as HTR
  // but apparently is not possible https://github.com/express-validator/express-validator/issues/682
  for (const output of outputs) {
    // If sent the new token parameter inside output, we use it
    // otherwise we try to get from old parameter in token object
    // if none exist we use default as HTR
    if (!output.token) {
      const tokenObj = req.body.token || hathorLibConstants.HATHOR_TOKEN_CONFIG;
      output.token = tokenObj.uid;
    }

    // Updating the `tokens` amount
    if (!tokens.has(output.token)) {
      tokens.set(output.token, { tokenUid: output.token, amount: 0 });
    }
    const sumObject = tokens.get(output.token);
    sumObject.amount += output.value;
  }

  // Expects array of objects with {'hash', 'index'}
  let inputs = req.body.inputs || [];
  const changeAddress = req.body.change_address || null;
  const debug = req.body.debug || false;
  if (debug) {
    wallet.enableDebugMode();
  }

  if (inputs.length > 0) {
    // In case the first input is a query command, we will overwrite the inputs array with results
    if (inputs[0].type === 'query') {
      // Overwriting the body parameter with the actual inputs
      const query = inputs[0];
      inputs = [];

      // We need to fetch UTXO's for each token on the "outputs"
      for (const element of tokens) {
        const [tokenUid, tokenObj] = element;

        const queryOptions = {
          ...query,
          token: tokenUid
        };
        const utxos = getUtxosToFillTx(wallet, tokenObj.amount, queryOptions);
        if (!utxos) {
          const response = {
            success: false,
            error: 'No utxos available for the query filter for this amount.',
            token: tokenUid
          };
          res.send(response);
          lock.unlock(lockTypes.SEND_TX);
          return;
        }

        for (const utxo of utxos) {
          inputs.push({ txId: utxo.tx_id, index: utxo.index });
        }
      }
    } else {
      // The new lib version expects input to have tx_id and not hash
      inputs = inputs.map(input => ({ txId: input.hash, index: input.index }));
    }
  }

  try {
    const response = await wallet.sendManyOutputsTransaction(outputs, { inputs, changeAddress });
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    const ret = { success: false, error: err.message };
    if (debug) {
      logger.debug('/send-tx failed', {
        body: req.body,
        response: ret,
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
    res.send({ success: true, ...mapTxReturn(response) });
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
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    res.send({ success: false, error: err.message });
  } finally {
    lock.unlock(lockTypes.SEND_TX);
  }
}

function stop(req, res) {
  // Stop wallet and remove from wallets object
  const { wallet } = req;
  wallet.stop();

  delete initializedWallets[req.walletId];
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
