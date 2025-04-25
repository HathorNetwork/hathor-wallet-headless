/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { txApi, featuresApi, WalletType, constants: hathorLibConstants, helpersUtils, errors, tokensUtils, transactionUtils, PartialTx } = require('@hathor/wallet-lib');
const { matchedData } = require('express-validator');
// import is used because there is an issue with winston logger when using require ref: #262
const { JSONBigInt } = require('@hathor/wallet-lib/lib/utils/bigint');
const { parametersValidation } = require('../../helpers/validations.helper');
const { friendlyWalletState, cantSendTxErrorMessage } = require('../../helpers/constants');
const { mapTxReturn, prepareTxFunds, getTx, markUtxosSelectedAsInput, runSendTransaction } = require('../../helpers/tx.helper');
const { stopWallet } = require('../../services/wallets.service');
const { lockSendTx } = require('../../helpers/lock.helper');

/**
 * @typedef {import('@hathor/wallet-lib').SendTransaction} SendTransaction
 * @typedef {import('@hathor/wallet-lib').HathorWallet} HathorWallet
 * @typedef {import('winston').Logger} Logger
 * @typedef {{ walletId: string, wallet: HathorWallet, logger: Logger }} HathorRequestExtras
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {ExpressRequest & HathorRequestExtras} Request
 * @typedef {import('express').Response} Response
 */

/**
 * @param {Request} req
 * @param {Response} res
 */
async function getStatus(req, res) {
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const data = {
    statusCode: wallet.state,
    statusMessage: friendlyWalletState[wallet.state],
    network: wallet.getNetwork(),
    serverUrl: wallet.getServerUrl(),
    serverInfo: wallet.storage.version,
  };

  if (await wallet.getWalletType() === WalletType.MULTISIG) {
    const multisigData = await wallet.getMultisigData();
    data.multisig = {
      numSignatures: multisigData.numSignatures,
      totalParticipants: multisigData.pubkeys.length,
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
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  // Expects token uid
  const token = req.query.token || hathorLibConstants.NATIVE_TOKEN_UID;
  const balanceObj = await wallet.getBalance(token);
  res.send({ available: balanceObj[0].balance.unlocked, locked: balanceObj[0].balance.locked });
}

async function getAddress(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const { index } = req.query;
  let address;
  if (index !== undefined) {
    // Because of isInt and toInt, it's safe to assume that index is now an integer >= 0
    address = await wallet.getAddressAtIndex(index);
  } else {
    const markAsUsed = req.query.mark_as_used || false;
    const addressInfo = await wallet.getCurrentAddress({ markAsUsed });
    address = addressInfo.address;
  }
  res.send({ address });
}

async function getAddressIndex(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const { address } = req.query;
  const index = await wallet.getAddressIndex(address);
  if (index === null) {
    // Address does not belong to the wallet
    res.send({ success: false });
  } else {
    res.send({ success: true, index });
  }
}

async function getAddressInfo(req, res) {
  // Query parameters validation
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const { address, token } = matchedData(req, { locations: ['query'] });
  try {
    const result = await wallet.getAddressInfo(address, { token });
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
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  // TODO Add pagination
  const addresses = [];
  const iterator = await wallet.getAllAddresses();

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

async function getTxHistory(req, res) {
  // TODO Add pagination
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const limit = req.query.limit || null;
  const history = await wallet.getFullHistory();
  if (limit) {
    const values = Object.values(history);
    const sortedValues = values.sort((a, b) => b.timestamp - a.timestamp);
    res.send(sortedValues.slice(0, limit));
  } else {
    res.send(Object.values(history));
  }
}

async function getTransaction(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const { id } = req.query;
  const tx = await wallet.getTx(id);
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
  /**
   * @type {HathorWallet} wallet - Wallet object
   */
  const { wallet } = req;
  const { id } = req.query;
  // This is O(1) operation, so we can use it to check if this tx belongs to the wallet
  const tx = await wallet.getTx(id);
  if (!tx) {
    // We allow only to get data for transactions from the wallet
    res.send({ success: false, error: `Wallet does not contain transaction with id ${id}` });
    return;
  }

  // First get transaction data from full node

  // Disabling this eslint rule because of the way API call is done in the lib
  // otherwise the code would need to be more complex
  // We should change this when we refactor the way we call APIs in the lib
  // eslint-disable-next-line no-promise-executor-return
  const txDataResponse = await new Promise(resolve => txApi.getTransaction(id, resolve));

  if (!txDataResponse.success) {
    res.send({ success: false, error: 'Failed to get transaction data from the full node.' });
    return;
  }

  // Now we get the current height of the network
  let bestChainHeight;
  try {
    const featuresResponse = await featuresApi.getFeatures();
    bestChainHeight = featuresResponse.block_height;
  } catch (err) {
    res.send({ success: false, error: 'Failed to get network heigth from the full node.' });
    return;
  }

  let confirmationNumber = 0;

  // first_block_height will be null until a block confirms this transaction
  if (txDataResponse.meta && txDataResponse.meta.first_block_height) {
    confirmationNumber = bestChainHeight - txDataResponse.meta.first_block_height;
  }

  res.send({ success: true, confirmationNumber });
}

/**
 * @param {Request} req
 * @param {Response} res
 */
async function simpleSendTx(req, res) {
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
  const { address, value, token } = req.body;
  let tokenId;
  if (token) {
    if (typeof token === 'string') {
      tokenId = token;
    } else {
      tokenId = token.uid;
    }
  } else {
    tokenId = hathorLibConstants.NATIVE_TOKEN_UID;
  }
  const changeAddress = req.body.change_address || null;

  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }

    /** @type {SendTransaction} */
    const sendTransaction = await wallet.sendTransactionInstance(
      address,
      value,
      { token: tokenId, changeAddress },
    );
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    logger.error(err);
    res.send({ success: false, error: err.message });
  }
}

async function decodeTx(req, res) {
  function getToken(utxo, txObj) {
    if (utxo.token) return utxo.token;
    if (utxo.token_data === 0) return hathorLibConstants.NATIVE_TOKEN_UID;

    const tokenIndex = (utxo.token_data & hathorLibConstants.TOKEN_INDEX_MASK) - 1;
    if (txObj.tokens.length > tokenIndex) return txObj.tokens[tokenIndex];
    return undefined;
  }

  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /** @type {{ logger: import('winston').Logger }} */
  const { logger } = req;
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
      version: tx.version,
      type: tx.getType(),
      tokens: tx.tokens,
      inputs: [],
      outputs: [],
    };

    for (const input of tx.inputs) {
      const _tx = await getTx(req.wallet, input.hash, { logger });
      if (!_tx) {
        throw new Error(`Could not find input transaction for txId ${input.hash}`);
      }

      const utxo = _tx.outputs[input.index];
      const inputData = {
        txId: input.hash,
        index: input.index,
        decoded: utxo.decoded,
        token: getToken(utxo, _tx),
        value: utxo.value,
        // This is required by transactionUtils.getTxBalance
        // It should be ignored by users
        token_data: utxo.token_data,
        // User facing duplication to keep scheme consistency
        tokenData: utxo.token_data,
        script: utxo.script,
        signed: !!input.data,
        mine: await req.wallet.isAddressMine(utxo.decoded.address),
      };

      data.inputs.push(inputData);
    }

    for (const output of tx.outputs) {
      output.parseScript(req.wallet.getNetworkObject());

      const outputData = {
        value: output.value,
        // This is required by transactionUtils.getTxBalance
        // It should be ignored by users
        token_data: output.tokenData,
        // User facing duplication to keep scheme consistency
        tokenData: output.tokenData,
        script: output.script.toString('base64'),
        type: output.decodedScript.getType(),
        decoded: output.decodedScript,
        mine: false,
      };

      if (output.tokenData !== 0) {
        outputData.token = tx.tokens[output.getTokenIndex()];
      } else {
        outputData.token = hathorLibConstants.NATIVE_TOKEN_UID;
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
          outputData.mine = await req.wallet.isAddressMine(output.decodedScript.address.base58);
      }
      data.outputs.push(outputData);
    }

    // True if all the inputs are signed, false otherwise
    data.completeSignatures = data.inputs.length > 0
      ? data.inputs.every(input => input.signed) // true until find a false statement
      : false; // empty data.inputs

    // Get balance
    const balance = {};
    const balanceObj = await transactionUtils.getTxBalance(data, req.wallet.storage);
    for (const token of Object.keys(balanceObj)) {
      balance[token] = ({
        tokens: {
          available: balanceObj[token].tokens.unlocked,
          locked: balanceObj[token].tokens.locked,
        },
        authorities: {
          melt: {
            available: balanceObj[token].authorities.melt.unlocked,
            locked: balanceObj[token].authorities.melt.locked,
          },
          mint: {
            available: balanceObj[token].authorities.mint.unlocked,
            locked: balanceObj[token].authorities.mint.locked,
          },
        }
      });
    }

    res.send({ success: true, tx: data, balance });
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

  const unlock = lockSendTx(req.walletId);
  if (unlock === null) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }
  /**
   * @type {{wallet: HathorWallet, logger: import('winston').Logger}}
   */
  const { wallet, logger } = req;

  /**
   * This works because it only uses facade methods so the logic is unchanged.
   * But the best approach would be to use the new methods to select utxos and prepare the tx.
   */
  const preparedFundsResponse = await prepareTxFunds(
    wallet,
    req.body.outputs,
    req.body.inputs || [],
    (req.body.token && req.body.token.uid) || hathorLibConstants.NATIVE_TOKEN_UID,
  );
  if (!preparedFundsResponse.success) {
    unlock();
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
    /** @type {SendTransaction} */
    const sendTransaction = await wallet.sendManyOutputsSendTransaction(
      outputs,
      { inputs, changeAddress },
    );
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    const ret = { success: false, error: err.message };
    if (debug) {
      logger.debug('/send-tx failed', {
        body: JSONBigInt.stringify(req.body),
        response: JSON.stringify(ret),
      });
    }
    res.send(ret);
  } finally {
    if (debug) {
      wallet.disableDebugMode();
    }
  }
}

async function createToken(req, res) {
  // TODO: Unify common code with create-nft
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

  const { wallet } = req;
  const { name, symbol, amount } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const createMint = req.body.create_mint ?? true;
  const mintAuthorityAddress = req.body.mint_authority_address || null;
  const allowExternalMintAuthorityAddress = req.body.allow_external_mint_authority_address || false;
  const createMelt = req.body.create_melt ?? true;
  const meltAuthorityAddress = req.body.melt_authority_address || null;
  const allowExternalMeltAuthorityAddress = req.body.allow_external_melt_authority_address || false;
  const data = req.body.data || null;
  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }

    /** @type {SendTransaction} */
    const sendTransaction = await wallet.createNewTokenSendTransaction(
      name,
      symbol,
      amount,
      {
        changeAddress,
        address,
        createMint,
        mintAuthorityAddress,
        allowExternalMintAuthorityAddress,
        createMelt,
        meltAuthorityAddress,
        allowExternalMeltAuthorityAddress,
        data,
      }
    );
    const tx = await runSendTransaction(sendTransaction, unlock);

    const configurationString = tokensUtils.getConfigurationString(
      tx.hash,
      tx.name,
      tx.symbol
    );
    res.send({ success: true, configurationString, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
  }
}

async function mintTokens(req, res) {
  // Unify common code with melt-tokens
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

  const { wallet } = req;
  const { token, amount } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const mintAuthorityAddress = req.body.mint_authority_address || null;
  const allowExternalMintAuthorityAddress = req.body.allow_external_mint_authority_address || false;
  const unshiftData = req.body.unshift_data;
  const data = req.body.data || null;

  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }
    /** @type {SendTransaction} */
    const sendTransaction = await wallet.mintTokensSendTransaction(
      token,
      amount,
      {
        address,
        changeAddress,
        mintAuthorityAddress,
        allowExternalMintAuthorityAddress,
        unshiftData,
        data,
      }
    );
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
  }
}

async function meltTokens(req, res) {
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

  const { wallet } = req;
  const { token, amount } = req.body;
  const changeAddress = req.body.change_address || null;
  const depositAddress = req.body.deposit_address || null;
  const meltAuthorityAddress = req.body.melt_authority_address || null;
  const allowExternalMeltAuthorityAddress = req.body.allow_external_melt_authority_address || false;
  const unshiftData = req.body.unshift_data;
  const data = req.body.data || null;

  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }
    /** @type {SendTransaction} */
    const sendTransaction = await wallet.meltTokensSendTransaction(
      token,
      amount,
      {
        address: depositAddress,
        changeAddress,
        meltAuthorityAddress,
        allowExternalMeltAuthorityAddress,
        unshiftData,
        data,
      }
    );
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
  }
}

async function utxoFilter(req, res) {
  try {
    const validationResult = parametersValidation(req);
    if (!validationResult.success) {
      res.status(400).json(validationResult);
      return;
    }

    const { wallet } = req;
    const options = matchedData(req, { locations: ['query'] });

    // XXX Internally this has been renamed to max_amount
    // Will keep the old name in the api for compatibility
    if (options.maximum_amount) {
      options.max_amount = options.maximum_amount;
    }

    // TODO Memory usage enhancements are required here as wallet.getUtxos can cause issues on
    //  wallets with a huge amount of utxos.
    // TODO Add pagination
    const ret = await wallet.getUtxos(options);
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

  const unlock = lockSendTx(req.walletId);
  if (unlock === null) {
    res.send({ success: false, error: cantSendTxErrorMessage });
    return;
  }

  const { wallet } = req;
  const { destination_address: destinationAddress, ...options } = matchedData(req, { locations: ['body'] });

  try {
    /** @type {SendTransaction} */
    const { sendTx: sendTransaction, ...rest } = await wallet.consolidateUtxosSendTransaction(
      destinationAddress,
      options,
    );
    const tx = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, txId: tx.hash, ...rest });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
  }
}

async function createNft(req, res) {
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

  const { wallet } = req;
  const { name, symbol, amount, data } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const createMint = req.body.create_mint || false;
  const mintAuthorityAddress = req.body.mint_authority_address || null;
  const allowExternalMintAuthorityAddress = req.body.allow_external_mint_authority_address || false;
  const createMelt = req.body.create_melt || false;
  const meltAuthorityAddress = req.body.melt_authority_address || null;
  const allowExternalMeltAuthorityAddress = req.body.allow_external_melt_authority_address || false;
  try {
    if (changeAddress && !await wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }
    /** @type {SendTransaction} */
    const sendTransaction = await wallet.createNFTSendTransaction(
      name,
      symbol,
      amount,
      data,
      {
        address,
        changeAddress,
        createMint,
        mintAuthorityAddress,
        allowExternalMintAuthorityAddress,
        createMelt,
        meltAuthorityAddress,
        allowExternalMeltAuthorityAddress,
      }
    );
    const tx = await runSendTransaction(sendTransaction, unlock);
    const configurationString = tokensUtils.getConfigurationString(
      tx.hash,
      tx.name,
      tx.symbol
    );
    res.send({ success: true, configurationString, ...mapTxReturn(tx) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
  }
}

async function stop(req, res) {
  // Stop wallet and remove from wallets object
  await stopWallet(req.walletId);
  res.send({ success: true });
}

/**
 * Mark the inputs from the txHex as used.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function utxosSelectedAsInput(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /** @type {{ wallet: import('@hathor/wallet-lib').HathorWallet }} */
  const { wallet } = req;
  const { txHex, ttl } = req.body;
  const markAsUsed = req.body.mark_as_used ?? true;

  try {
    const tx = helpersUtils.createTxFromHex(txHex, wallet.getNetworkObject());
    await markUtxosSelectedAsInput(
      wallet,
      tx.inputs.map(
        input => ({ txId: input.hash, index: input.index })
      ),
      markAsUsed,
      ttl,
    );

    res.send({ success: true });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
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
  utxosSelectedAsInput,
};
