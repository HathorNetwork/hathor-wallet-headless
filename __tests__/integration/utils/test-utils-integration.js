/* eslint-disable no-console */

import supertest from 'supertest';
import { txApi, walletApi, HathorWallet, walletUtils } from '@hathor/wallet-lib';
import createApp from '../../../src/app';
import { initializedWallets } from '../../../src/services/wallets.service';
import { loggers } from './logger.util';
import testConfig from '../configuration/test.config';
import { WALLET_EVENTS, WalletBenchmarkUtil } from './benchmark/wallet-benchmark.util';
import { delay } from './core.util';
import { TxTimeHelper } from './benchmark/tx-time.helper';
import { WALLET_CONSTANTS } from '../configuration/test-constants';
import settings from '../configuration/settings-fixture';

export { getRandomInt } from './core.util';

const config = settings._getDefaultConfig();

let request; let
  server;

/**
 * @typedef WalletData
 * @description Contains the data to instantiate a wallet.
 *
 * _Obs_: One of [`words`, `seedKey`] is always required.
 * If both are present, prefer `words`
 *
 * _Obs[2]_: `multisig` can only be used with `seedKey`
 * because of the extra configuration required (pubkeys, numSignatures, total)
 * that are connected to a configured seedKey
 *
 * @property {string} walletId Id for interacting with the wallet after starting it
 * @property {string} [words] 24 word seed for the wallet
 * @property {string} [seedKey] key that references a seed on configuration
 * @property {string[]} [addresses] Pre-calculated addresses to start the wallet with
 * @property {boolean} [multisig=false] If this should represent a multisig wallet
 */

export class TestUtils {
  /**
   * Returns the Supertest `request` object for this application
   * @returns {Test}
   */
  static get request() {
    return request;
  }

  static startServer() {
    return new Promise((resolve, reject) => {
      const app = createApp(config);
      server = app.listen(8088, err => {
        if (err) {
          return reject(err);
        }

        // Ensures the supertest agent will be bound to the correct express port
        request = supertest.agent(server);
        return resolve();
      });
    });
  }

  static stopServer() {
    server.close();
  }

  /**
   * Generates seed words for a new wallet
   * @returns {string|*}
   */
  static generateWords() {
    return walletUtils.generateWalletWords();
  }

  /**
   * Generates the header for requesting a protected route on the wallet headless
   *
   * @see TestUtils.stopWallet
   * @param {string} walletId
   * @returns {{'x-wallet-id'}}
   */
  static generateHeader(walletId) {
    return { 'x-wallet-id': walletId };
  }

  /**
   * Adds a message to the Transaction Log for a test.
   * This log is specific to wallets and transactions, to better understand the current state of the
   * blockchain, and not intended for logging system errors.
   * @param {string} message
   * @param {Record<string,unknown>} [metadata] Additional data for winston logs
   * @param {'log'|'warn'|'error'} [type='log'] Optional log type
   */
  static log(message, metadata, type) {
    switch (type) {
      case 'warn':
        loggers.test.insertWarnToLog(message, metadata);
        break;
      case 'error':
        loggers.test.insertErrorToLog(message, metadata);
        break;
      default:
        loggers.test.insertLineToLog(message, metadata);
    }
  }

  /**
   * @typedef TransactionErrorObject
   * @extends {Error}
   * @property {number|string} status Response status
   * @property {unknown} requestBody Object sent as query and/or body on the post
   * @property {unknown} response Full response
   */

  /**
   * Common error handler for all transaction methods on the test utils
   * @param params
   * @param {string} params.methodName Name of the caller method, to help on log metadata
   * @param {unknown} params.txResponse The HTTP response from Wallet Headless
   * @param {unknown} params.requestBody The body or query object used on the HTTP request
   * @param {boolean} [params.dontLogErrors] Skip logging errors, if an exception is expected
   * @param {string[]} [params.walletIdsToWait] List of wallet ids to wait for the tx to be received
   * @returns {{success}|unknown}
   * @throws {TransactionErrorObject} Treated error object
   */
  static async handleTransactionResponse(params) {
    const transaction = params.txResponse.body;
    const logMetadata = {
      status: params.txResponse.status,
      requestBody: params.requestBody,
      responseBody: transaction,
      response: params.txResponse
    };

    if (!transaction.success) {
      const txError = new Error(transaction.message);
      Object.assign(txError, logMetadata); // Enrich the error object for simpler assertions

      /*
       * Jest doesn't really help with debug data when errors occur, so we're logging this manually
       * most of the time. Except when we explicitly inform not to.
       * (Ex.: when we pass invalid arguments and an exception is expected)
       */
      if (!params.dontLogErrors) {
        delete logMetadata.response; // Avoid log pollution with excessive data
        TestUtils.log(`${(params.methodName)} error`, logMetadata, 'error');
      }

      delete txError.responseBody; // Removing duplicate data
      throw txError;
    }

    const walletIdsToWait = params.walletIdsToWait ?? [];

    for (const walletId of walletIdsToWait) {
      await TestUtils.waitForTxReceived(walletId, transaction.hash);
    }

    return transaction;
  }

  /**
   * Logs a custom error message to the correct output to be analyzed later
   * @param {string} message Custom error message
   */
  static logError(message) {
    console.error(message);
  }

  /**
   * Helper method for diagnosing erros on utxo's. Should not be used on actual testing.
   *
   * @param {string} walletId
   * @param {string} [token]
   * @param {Error} [err]
   * @returns {Promise<void>}
   */
  static async dumpUtxos({ walletId, token, err }) {
    const utxoData = await TestUtils.getUtxos({ walletId, token });
    const dumpMessage = `Dumping all UTXOs for ${walletId}`;
    TestUtils.log(dumpMessage, utxoData);

    if (err) {
      const treatedErr = {
        stack: err.stack,
        sendOptions: err.sendOptions,
        body: err.response.body
      };
      TestUtils.log('Error dump', treatedErr);
    }
  }

  /**
   * Starts a wallet. Prefer instantiating a WalletHelper instead.
   * @param {WalletData} walletObj
   * @param [options]
   * @param {boolean} [options.waitWalletReady] If true, will only return when wallet is ready
   * @returns {Promise<{start:unknown,status:unknown}>}
   */
  static async startWallet(walletObj, options = {}) {
    let response;

    WalletBenchmarkUtil.informWalletEvent(
      walletObj.walletId,
      WALLET_EVENTS.startRequest,
      { multisig: walletObj.multisig }
    );

    // Request the Wallet start
    if (walletObj.words) {
      response = await request
        .post('/start')
        .send({
          seed: walletObj.words,
          'wallet-id': walletObj.walletId,
          preCalculatedAddresses: walletObj.addresses
        });
    } else {
      response = await request
        .post('/start')
        .send({
          seedKey: walletObj.seedKey,
          'wallet-id': walletObj.walletId,
          multisig: walletObj.multisig || false,
          preCalculatedAddresses: walletObj.addresses
        });
    }
    WalletBenchmarkUtil.informWalletEvent(
      walletObj.walletId,
      WALLET_EVENTS.startResponse,
    );

    // Handle errors
    if (response.status !== 200) {
      throw new Error(`Unable to start the wallet: ${walletObj.walletId}`);
    }
    if (!response.body.success) {
      console.error(`Failure starting the wallet: ${response.body.message}`);
      throw new Error(response.body.message);
    }
    const start = response.body;

    // Wait until the wallet is actually started
    if (options.waitWalletReady) {
      await TestUtils.poolUntilWalletReady(walletObj.walletId);
      WalletBenchmarkUtil.informWalletEvent(
        walletObj.walletId,
        WALLET_EVENTS.confirmedReady,
      );
    }
    // Log the success and return
    if (walletObj.words) {
      loggers.test.informNewWallet(walletObj.walletId, walletObj.words);
    } else if (walletObj.multisig) {
      loggers.test.informNewMultisigWallet(walletObj.walletId, walletObj.seedKey);
    } else {
      loggers.test.informNewWallet(walletObj.walletId, `seedKey: ${walletObj.seedKey}`);
    }

    return { start };
  }

  /**
   * Makes a http request to check if the wallet is ready.
   * Returns only the boolean result.
   * @param {string} walletId Identification of the wallet
   * @returns {Promise<boolean>} `true` if the wallet is ready
   */
  static async isWalletReady(walletId) {
    const res = await request
      .get('/wallet/status')
      .set(TestUtils.generateHeader(walletId))
      .catch(err => {
        TestUtils.log('Status error.', { message: err.message, stack: err.stack }, 'error');
        throw err;
      });

    const statusCode = res.body?.statusCode;
    if (statusCode === HathorWallet.ERROR) {
      throw new Error(`Wallet ${walletId} initialization failed.`);
    }
    return statusCode === HathorWallet.READY;
  }

  static async poolUntilWalletReady(walletId) {
    while (true) {
      const walletReady = await TestUtils.isWalletReady(walletId);
      if (walletReady) {
        return;
      }
      await delay(1000);
    }
  }

  /**
   * Stops a wallet. Prefer using the WalletHelper instead.
   * @param {string} walletId
   * @returns {Promise<void>}
   */
  static async stopWallet(walletId) {
    await request.post('/wallet/stop').set(TestUtils.generateHeader(walletId));
  }

  /**
   * Gets the address from a walletId and an index, using the Wallet Headless endpoint.
   * If no index is informed, the next address without transactions will be returned
   * @param {string} walletId Walled identification
   * @param {number} [index]
   * @param {boolean} [markAsUsed] If true, this address will not be returned again on later calls
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1address/get
   * @returns {Promise<string>}
   */
  static async getAddressAt(walletId, index, markAsUsed) {
    const requestParams = { index };
    if (markAsUsed) {
      requestParams.mark_as_used = true;
    }

    const response = await TestUtils.request
      .get('/wallet/address')
      .query(requestParams)
      .set(TestUtils.generateHeader(walletId));

    return response.body.address;
  }

  /**
   * Retrieves the Address Index on the Wallet
   * @param {string} walletId Wallet identification
   * @param {string} address Address to find the index
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1address-index/get
   * @returns {Promise<number>}
   */
  static async getAddressIndex(walletId, address) {
    const response = await TestUtils.request
      .get('/wallet/address-index')
      .query({ address })
      .set(TestUtils.generateHeader(walletId));

    return response.body.index;
  }

  /**
   * Retrieves address information based on the address index inside the wallet.
   * This is very close to the tests on `address-info.test.js` and as such should reflect any
   * changes that are made to the calls there.
   * @param {string} address Address hash
   * @param {string} walletId Wallet identification
   * @param {string} [token] Token hash, defaults to HTR
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1address-info/get
   * @returns {Promise<{
   * token: (string), index: (number),
   * total_amount_received: (number), total_amount_sent: (number),
   * total_amount_locked: (number), total_amount_available: (number)
   * }>}
   */
  static async getAddressInfo(address, walletId, token) {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({
        address,
        token
      })
      .set(TestUtils.generateHeader(walletId));

    // An error happened
    if (response.status !== 200 || response.body.success !== true) {
      throw new Error(`Failure on /wallet/address-info: ${response.text}`);
    }

    // Returning explicitly each property to help with code completion / test writing
    const addrInfo = response.body;
    return {
      token: addrInfo.token,
      index: addrInfo.index,
      total_amount_received: addrInfo.total_amount_received,
      total_amount_sent: addrInfo.total_amount_sent,
      total_amount_available: addrInfo.total_amount_available,
      total_amount_locked: addrInfo.total_amount_locked,
    };
  }

  /**
   * Get the all addresses on this wallet, limited by the current gap limit.
   * @param {string} walletId
   * @returns {Promise<string[]>}
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1addresses/get
   */
  static async getSomeAddresses(walletId) {
    const response = await TestUtils.request
      .get('/wallet/addresses')
      .set(TestUtils.generateHeader(walletId));

    if (!response.body.addresses) {
      throw new Error(response.text);
    }
    return response.body.addresses;
  }

  /**
   * Transfers funds to a destination address.
   * All transaction changes are sent to the first address of the genesis wallet, to prevent
   * performance issues with the gap limit.
   * @param {string} address Destination address
   * @param {number} value Amount of tokens, in cents
   * @param {string} destinationWalletId walletId of the destination address. Useful for debugging
   * @returns {Promise<unknown>}
   */
  static async injectFundsIntoAddress(address, value, destinationWalletId) {
    // Requests the transaction
    const requestBody = {
      address,
      value,
      change_address: WALLET_CONSTANTS.genesis.addresses[0]
    };

    const txTimeHelper = new TxTimeHelper('simple-send-tx');
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send(requestBody)
      .set(TestUtils.generateHeader(WALLET_CONSTANTS.genesis.walletId));
    txTimeHelper.informResponse(response.body.hash);

    const transaction = await TestUtils.handleTransactionResponse({
      methodName: 'injectFundsIntoAddress',
      requestBody,
      txResponse: response,
      walletIdsToWait: [WALLET_CONSTANTS.genesis.walletId, destinationWalletId],
    });

    // Logs the results
    await loggers.test.informSimpleTransaction({
      title: 'Injecting funds',
      originWallet: WALLET_CONSTANTS.genesis.walletId,
      value,
      destinationAddress: address,
      destinationWallet: destinationWalletId,
      id: transaction.hash
    });

    return transaction;
  }

  /**
   * Searches the transaction outputs and retrieves the first index containing the desired value.
   * @example
   * // The txObject transaction contains many outputs, the second's value is 15
   * TestUtils.getOutputIndexFromTx(txObject, 15)
   * // will return 1
   *
   * @param {unknown} transaction Transaction object, as returned in the `response.body`
   * @param {number} value Value to search for
   * @returns {number|null} Zero-based index containing the desired output
   */
  static getOutputIndexFromTx(transaction, value) {
    if (!transaction?.outputs?.length) {
      return null;
    }

    for (const index in transaction.outputs) {
      if (transaction.outputs[index].value !== value) {
        continue;
      }
      return parseInt(index, 10);
    }

    return null;
  }

  /**
   * A helper method for fetching the change output. Only useful when the transaction has exactly
   * two HTR outputs: one for the destination and one for the change address
   * @param {unknown} transaction Transaction as received in the response.body
   * @param {number} destinationValue Value transferred to the destination
   * @returns {{
   * change: {index: number, value: number},
   * destination: {index: number, value: number}
   * }|null}
   */
  static getOutputSummaryHtr(transaction, destinationValue) {
    const returnValue = {
      destination: { index: null, value: destinationValue },
      change: { index: null, value: null }
    };

    if (!transaction.outputs?.length) {
      return null;
    }

    for (const index in transaction.outputs) {
      const output = transaction.outputs[index];

      // Skipping all that outputs not involving HTR
      if (output.token_data !== 0) {
        continue;
      }

      // If the value is destinationValue, we assume this is the destination
      if (output.value === destinationValue) {
        returnValue.destination.index = index;
        continue;
      }

      // Any other value, we assume it's the change
      returnValue.change.index = index;
      returnValue.change.value = output.value;
    }

    return returnValue;
  }

  /**
   * Returns the transaction history for a given walletId
   * @param {string} walletId Wallet id
   * @returns {Promise<unknown>}
   */
  static async getTxHistory(walletId) {
    const response = await TestUtils.request
      .get('/wallet/tx-history')
      .set(TestUtils.generateHeader(walletId));

    return response.body;
  }

  /**
   * Returns the balance for a given walletId and optional token
   * @param {string} walletId Wallet id
   * @param {string} [tokenUid] Optional custom token, defaults to HTR
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1balance/get
   * @returns {Promise<{ available: number, locked: number }>}
   */
  static async getBalance(walletId, tokenUid) {
    const queryParams = {};
    if (tokenUid) {
      queryParams.token = tokenUid;
    }

    const response = await TestUtils.request
      .get('/wallet/balance')
      .query(queryParams)
      .set(TestUtils.generateHeader(walletId));

    return response.body;
  }

  /**
   * Returns a fully decoded transaction to allow for more complete data analysis.
   * This is done through an HTTP request on the Wallet Headless, in behalf of a started wallet id.
   *
   * @param {string} txHash Transaction id
   * @param {string} walletId Mandatory wallet id for requesting the Wallet Headless
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1transaction/get
   * @returns {Promise<*>}
   */
  static async getDecodedTransaction(txHash, walletId) {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: txHash
      })
      .set(TestUtils.generateHeader(walletId));

    return response.body;
  }

  /**
   * Returns the serialized signatures for a transaction inputs (only the ones owned by the wallet)
   *
   * @param {string} txHex Transaction
   * @returns {Promise<*>}
   */
  static async getSignatures(txHex, walletId) {
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/get-my-signatures')
      .send({ txHex })
      .set(TestUtils.generateHeader(walletId));

    return response.body && response.body.signatures;
  }

  /**
   * @typedef FilterUtxosResponse
   * @property {number} total_amount_available
   * @property {number} total_utxos_available
   * @property {number} total_amount_locked
   * @property {number} total_utxos_locked
   * @property {{
   *  address:string,
   *  amount:number,
   *  tx_id:string,
   *  locked:boolean,
   *  index:number
   * }[]} utxos
   */

  /**
   * Makes a request to get UTXO's for a specific query.
   *
   * @param params
   * @param {string} params.walletId Wallet Identification
   * @param {number} [params.max_utxos] Maximum amount of results
   * @param {string} [params.token] Custom token to filter
   * @param {string} [params.filter_address] Specific address to filter
   * @param {number} [params.amount_smaller_than] Filter only UTXO's with value below this parameter
   * @param {number} [params.amount_bigger_than] Filter only UTXO's with value above this parameter
   * @param {number} [params.maximum_amount] Maximum amount of summed values
   * @param {boolean} [params.only_available] Filter only unlocked UTXOs
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1utxo-filter/get
   * @returns {Promise<FilterUtxosResponse>}
   */
  static async getUtxos(params) {
    const requestBody = { ...params };
    delete requestBody.walletId; // Removing the only attribute that has no relation to the request

    const utxoResponse = await TestUtils.request
      .get('/wallet/utxo-filter')
      .query(requestBody)
      .set(this.generateHeader(params.walletId));

    return utxoResponse.body;
  }

  /**
   * Consolidates UTXO's
   * @param params
   * @param {string} params.walletId Wallet Identification
   * @param {string} params.destination_address Address that will receive the funds
   * @param {number} [params.max_utxos] Maximum amount of source utxos used
   * @param {string} [params.token] Custom token to filter
   * @param {string} [params.filter_address] Specific address to filter for inputs
   * @param {string} [params.amount_smaller_than] Filter only UTXO's with value <= this parameter
   * @param {string} [params.amount_bigger_than] Filter only UTXO's with value >= this parameter
   * @param {string} [params.maximum_amount] Maximum amount of summed values
   * @param {boolean} [params.dontLogErrors] Skip logging errors.
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1utxo-consolidation/post
   * @returns {Promise<*>}
   */
  static async consolidateUtxos(params) {
    const requestBody = { ...params };
    delete requestBody.walletId; // Removing the only attribute that has no relation to the request

    const txTimeHelper = new TxTimeHelper('utxo-consolidation');
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send(requestBody)
      .set(this.generateHeader(params.walletId));
    txTimeHelper.informResponse(utxoResponse.body.txId);

    const transaction = await TestUtils.handleTransactionResponse({
      methodName: 'consolidateUtxos',
      requestBody,
      txResponse: utxoResponse,
      dontLogErrors: params.dontLogErrors,
      walletIdsToWait: [params.walletId],
    });

    TestUtils.log('UTXO consolidation', { requestBody, transaction });

    return transaction;
  }

  /**
   * Creates NFT's
   * @param params
   * @param {string} params.walletId Wallet Id for creating the token
   * @param {string} params.name Token name
   * @param {string} params.symbol Token symbol
   * @param {number} params.amount Token amount
   * @param {string} params.data Token data
   * @param {string} [params.address] Token destination address
   * @param {string} [params.change_address] Change address for the minting HTR
   * @param {boolean} [params.create_mint] Determines if the mint authority will be created
   * @param {boolean} [params.create_melt] Determines if the melt authority will be created
   * @param {boolean} [params.dontLogErrors] Skip logging errors.
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1create-nft/post
   * @returns {Promise<{success}|*>}
   */
  static async createNft(params) {
    const requestBody = { ...params };
    delete requestBody.walletId; // Removing the only attribute that has no relation to the request

    const txTimeHelper = new TxTimeHelper('create-nft');
    const nftResponse = await TestUtils.request
      .post('/wallet/create-nft')
      .send(requestBody)
      .set(this.generateHeader(params.walletId));
    txTimeHelper.informResponse(nftResponse.body.hash);

    const transaction = await TestUtils.handleTransactionResponse({
      methodName: 'createNft',
      requestBody,
      txResponse: nftResponse,
      dontLogErrors: params.dontLogErrors,
      walletIdsToWait: [params.walletId],
    });

    TestUtils.log('NFT Creation', { requestBody, transaction });

    return transaction;
  }

  /**
   * Returns the configuration string of a token
   * @param {string} token Token uid to get configuration string
   * @returns {Promise<{ configurationString: string }>}
   */
  static async getConfigurationString(token) {
    const response = await TestUtils.request
      .get('/configuration-string')
      .query({ token });

    return response.body;
  }

  /**
   * Returns a valid address to send tokens for burning
   * i.e. the tokens will be irrecoverable if sent to this address.
   * @returns {string}
   */
  static getBurnAddress() {
    // The address is a P2PKH generated with pubkeyhash of Buffer.alloc(20) (all 0x00 bytes)
    // This is only valid for privatenet
    return 'WNg2svm2qApxheBKndKGQ9sRwporvRgRpT';
  }

  /**
   * Get the number of blocks confirming a transaction
   * @param {string} walletId
   * @param {string} txId
   * @returns {Promise<number>}
   */
  static async getTransactionConfirmationNumber(walletId, txId) {
    const response = await TestUtils.request
      .get('/wallet/tx-confirmation-blocks')
      .query({ id: txId })
      .set(TestUtils.generateHeader(walletId));

    if (!response.body.success) {
      throw new Error(response.text);
    }
    return response.body.confirmationNumber;
  }

  /**
   * Get the transaction data from the full node
   * @param {string} txId
   * @returns {Promise<*>}
   */
  static async getFullNodeTransactionData(txId) {
    const errorMessage = 'Failed to get transaction data from full node.';
    let response;

    try {
      // Disabling this eslint rule because of the way API call is done in the lib
      // otherwise the code would need to be more complex
      // We should change this when we refactor the way we call APIs in the lib
      // eslint-disable-next-line no-promise-executor-return
      response = await new Promise(resolve => txApi.getTransaction(txId, resolve));
    } catch (e) {
      throw new Error(errorMessage);
    }

    if (!response.success) {
      throw new Error(errorMessage);
    }

    return response;
  }

  /**
   * Get the current network height from the full node
   * @returns {Promise<number>}
   */
  static async getFullNodeNetworkHeight() {
    const errorMessage = 'Failed to get network height from full node.';
    let response;

    try {
      // Disabling this eslint rule because of the way API call is done in the lib
      // otherwise the code would need to be more complex
      // We should change this when we refactor the way we call APIs in the lib
      // eslint-disable-next-line no-promise-executor-return
      response = await new Promise(resolve => walletApi.getMiningInfo(resolve));
    } catch (e) {
      throw new Error(errorMessage);
    }

    if (!response.success) {
      throw new Error(errorMessage);
    }

    return response.blocks;
  }

  /**
   * Wait until a new block is mined in the best chain. Returns the new block height.
   *
   * @param {number} [currentHeight=null] height to be used as base to wait for a new block if
   *                                      not sent, we get the current height of the network
   *
   * @returns {Promise<number>}
   */
  static async waitNewBlock(currentHeight = null) {
    let baseHeight = currentHeight;

    const timeout = testConfig.waitNewBlockTimeout;
    let timeoutReached = false;
    const timeoutHandler = setTimeout(() => {
      timeoutReached = true;
    }, timeout);

    if (!baseHeight) {
      baseHeight = await TestUtils.getFullNodeNetworkHeight();
    }

    let networkHeight = baseHeight;

    while (networkHeight === baseHeight) {
      if (timeoutReached) {
        break;
      }

      networkHeight = await TestUtils.getFullNodeNetworkHeight();

      await delay(1000);
    }

    clearTimeout(timeoutHandler);

    if (timeoutReached) {
      throw new Error('Timeout reached when waiting for the next block.');
    }

    return networkHeight;
  }

  /**
   * Call headless API to get a transaction from the wallet storage
   *
   * @param {string} walletId ID of the wallet to get the transaction from
   * @param {string} txId ID of the transaction to get
   *
   * @returns {Promise<*>} The return is an object with { success: boolean }
   *                       and the transaction object in case of success
   */
  static async getTransaction(walletId, txId) {
    const response = await TestUtils.request
      .get(`/wallet/transaction/?id=${txId}`)
      .set(TestUtils.generateHeader(walletId));

    return response.body;
  }

  /**
   * Waits until the transaction arrives in the wallet ws, or a timeout (optional)
   * is reached
   *
   * @param {string} walletId ID of the wallet to get the transaction from
   * @param {string} txId ID of the transaction to get
   * @param {number | undefined} timeout The timeout to stop waiting for the tx to arrive
   *                             if not present, it will wait forever
   *
   * @returns {Promise<Object>} Resolves with the tx data when the tx is found in the wallet's
   *                            storage or rejects if timeout is reached
   */
  static async waitForTxReceived(walletId, txId, timeout) {
    let timeoutHandler;
    let timeoutReached = false;
    if (timeout) {
      // Timeout handler
      timeoutHandler = setTimeout(() => {
        timeoutReached = true;
      }, timeout);
    }

    let result = await TestUtils.getTransaction(walletId, txId);

    while (result.success === false || result.processingStatus !== 'finished') {
      if (timeoutReached) {
        break;
      }
      // Tx not found, wait 1s before trying again
      await delay(1000);

      result = await TestUtils.getTransaction(walletId, txId);
    }

    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
    }

    if (timeoutReached) {
      // We must do the timeout handling like this because if I reject the promise directly
      // inside the setTimeout block, this while block will continue running forever.
      throw new Error(`Timeout of ${timeout}ms without receiving the tx with id ${txId}`);
    }

    if (result.is_voided === false) {
      const wallet = initializedWallets.get(walletId);
      const storageTx = await wallet.getTx(txId);
      // We can't consider the metadata only of the transaction, it affects
      // also the metadata of the transactions that were spent on it
      // We could await for the update-tx event of the transactions of the inputs to arrive
      // before considering the transaction metadata fully updated, however it's complicated
      // to handle these events, since they might arrive even before we call this method
      // To simplify everything, here we manually set the utxos as spent and process the history
      // so after the transaction arrives, all the metadata involved on it is updated and we can
      // continue running the tests to correctly check balances, addresses, and everyting else
      await TestUtils.updateInputsSpentBy(wallet, storageTx);
      await wallet.storage.processHistory();
    }

    await TestUtils.waitUntilNextTimestamp(result);

    return result;
  }

  /**
   * This method awaits a tx to be confirmed by a block
   *
   * It does not return any content, only delivers the code processing back to the caller at the
   * desired time.
   *
   * @param {string} walletId ID of the wallet to get the transaction from
   * @param {String} txId ID of the tx to wait confirmation
   * @param {number | null | undefined} timeout
   * @returns {Promise<void>}
   */
  static async waitTxConfirmed(walletId, txId, timeout) {
    let timeoutHandler;
    let timeoutReached = false;
    if (timeout) {
      // Timeout handler
      timeoutHandler = setTimeout(() => {
        timeoutReached = true;
      }, timeout);
    }

    let number = await TestUtils.getTransactionConfirmationNumber(walletId, txId);

    while (number < 1) {
      if (timeoutReached) {
        break;
      }
      // Tx not confirmed, wait 1s before trying again
      await delay(1000);

      number = await TestUtils.getTransactionConfirmationNumber(walletId, txId);
    }

    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
    }

    if (timeoutReached) {
      // We must do the timeout handling like this because if I reject the promise directly
      // inside the setTimeout block, this while block will continue running forever.
      throw new Error(`Timeout of ${timeout}ms without confirming the tx with id ${txId}`);
    }
  }

  /**
   * Loop through all inputs of a tx, get the corresponding transaction in the storage and
   * update the spent_by attribute
   *
   * @param {HathorWallet} wallet
   * @param {IHistoryTx} tx
   * @returns {Promise<void>}
   */
  static async updateInputsSpentBy(wallet, tx) {
    for (const input of tx.inputs) {
      const inputTx = await wallet.getTx(input.tx_id);
      if (!inputTx) {
        // This input is not spending an output from this wallet
        continue;
      }

      if (input.index > inputTx.outputs.length - 1) {
        // Invalid output index
        throw new Error('Try to get output in an index that doesn\'t exist.');
      }

      const output = inputTx.outputs[input.index];
      output.spent_by = tx.tx_id;
      await wallet.storage.addTx(inputTx);
    }
  }

  /**
   * This method helps a tester to ensure the current timestamp of the next transaction will be at
   * least one unit greater than the specified transaction.
   *
   * Hathor's timestamp has a granularity of seconds, and it does not allow one transaction to have
   * a parent with a timestamp equal to its own.
   *
   * It does not return any content, only delivers the code processing back to the caller at the
   * desired time.
   *
   * @param {IHistoryTx} tx
   * @returns {Promise<void>}
   */
  static async waitUntilNextTimestamp(tx) {
    const nowMilliseconds = Date.now().valueOf();
    const nextValidMilliseconds = (tx.timestamp + 1) * 1000;

    // We are already past the last valid milissecond
    if (nowMilliseconds > nextValidMilliseconds) {
      return;
    }

    // We are still within an invalid time to generate a new timestamp. Waiting for some time...
    const timeToWait = nextValidMilliseconds - nowMilliseconds + 10;
    await delay(timeToWait);
  }

  /**
   * Generate X signatures from a set of wallets for a given txHex.
   * The wallets to compose the signature are selected randomly.
   *
   * @param {string} txHex the encoded transaction proposal to be signed.
   * @param {WalletHelper[]} wallets a set of wallets corresponding to the multisig wallet.
   * @param {number} xSignatures amount of signatures.
   *
   * @return {Promise<string[]>} a set of signatures of X degree.
   */
  static async getXSignatures(txHex, wallets, xSignatures) {
    if (!txHex) {
      throw new Error(`'txHex' cannot be null or undefined`);
    }
    if (!Array.isArray(wallets)) {
      throw new Error(`'wallets' is not an array.`);
    }
    if (!(Number.isInteger(xSignatures) && Number.isFinite(xSignatures))) {
      throw new Error(`'xSignatures' is not a finite integer.`);
    }
    if (xSignatures < 1) {
      throw new Error(`'xSignatures' should be at least 1.`);
    }
    if (xSignatures > wallets.length) {
      throw new Error(`'xSignatures' can not be greater than the number of wallets.`);
    }

    const selectedWallets = {};
    let xLeft = xSignatures;
    while (xLeft > 0) {
      const rndIdx = Math.floor(Math.random() * wallets.length);
      if (selectedWallets[rndIdx]) {
        continue;
      }
      selectedWallets[rndIdx] = wallets[rndIdx];
      xLeft--;
    }

    const signatures = [];
    for (const wallet of Object.values(selectedWallets)) {
      if (!('getSignatures' in wallet)) {
        throw new Error(`'wallet' is not an instance of WalletHelper.`);
      }
      signatures.push(await wallet.getSignatures(txHex));
    }

    return signatures;
  }
}
