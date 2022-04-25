/* eslint-disable no-console */

import supertest from 'supertest';
import {
  constants as libConstants,
  HathorWallet,
  transaction as transactionUtils,
  wallet,
} from '@hathor/wallet-lib';
import app from '../../../src';
import { loggers } from './logger.util';
import testConfig from '../configuration/test.config';
import { WALLET_EVENTS, WalletBenchmarkUtil } from './benchmark/wallet-benchmark.util';
import { delay, getRandomInt } from './core.util';
import { TxTimeHelper } from './benchmark/tx-benchmark.util';

export { getRandomInt } from './core.util';

const request = supertest(app);

/**
 * @typedef WalletData
 * @property {string} walletId Id for interacting with the wallet
 * @property {string} [words] optional 24 word seed for the wallet
 * @property {string} [seedKey] optional key that references a seed on configuration
 * @property {string[]} [addresses] Some sample addresses to help with testing
 * @property {boolean} multisig If this should represent a multisig wallet
 *
 * Obs: One of [`words`, `seedKey`] is always required
 * If both are present, prefer `words`
 *
 * Obs[2]: `multisig` can only be used with `seedKey`
 * because of the extra configuration required (pubkeys, minSignatures, total)
 * that are connected to a configured seedKey
 */

/**
 * @type {Record<string,WalletData>}
 */
export const WALLET_CONSTANTS = {
  genesis: {
    walletId: 'genesiswallet',
    words: 'avocado spot town typical traffic vault danger century property shallow divorce festival spend attack anchor afford rotate green audit adjust fade wagon depart level',
    addresses: [
      'WPhehTyNHTPz954CskfuSgLEfuKXbXeK3f',
      'WY1URKUnqCTyiixW1Dw29vmeG99hNN4EW6', // Genesis funds, index 1
      'WRTFYzhTHkfYwub8EWVtAcUgbdUpsYMBpb',
      'WhpJeUtBLrDHbKDoMC9ffMxwHqvsrNzTFV',
      'WeBBm1LfKBH3V5rEL5DAHtjjDiAws3Z83m',
      'WWTNERwV3dcvWjCbR4rizMuEqPbFjZsd3C',
      'WR4EQB8wZUzsVnqhodBBbtYsvKxrr9puG7',
      'WjJZoqV3AbRfgBWNfjAyVYTydFuWNPgspW',
      'Wh2FHvahkwvt29saUz7jnhuDh3WDHuc2ZY',
      'Wg5bXXQpRE5DWwsGDNfHsKyisJPVotxhhS',
      'WiodAJyH67sSTGgpRPXWsVGEfGESN7ykEt',
      'WNpFPr1EDwBgtTqYUNTbKTRpbGj6vdNgdL',
      'WVPeyNm4pWjJJixjj1DsRc4ceYd75xCyxq',
      'WcZotwyy1FnFYuA8D2LqrUBSNEFcPr3T7a',
      'Wki6BdLTCzS4ZoQSY1QgfgzQdgT9R3txEb',
      'Wgk7UPN4zZZdMbsCNMSosRwsvHtMoWf8S6',
      'Wmqn3sanBexFaNk3nDtdb4SnHxB5MRzr7m',
      'Wbh9FrUF85FWUh7xgpqf9gjH7D2f3Py4kc',
      'WWGKeK7yJcKqvxMj2C8TFFJLooqq8Kc65z',
      'WRenJ9f6yqrYRzBUwqbBFAxAY7JzwryKut',
      'WQozCB8X2FFM9QtEMoPjo6xERVTkiBw8Mj',
      'Wds8d4vy691GwVDdzKrw1LpnvBR283VTci',
    ]
  },
  miner: {
    walletId: 'miner-wallet',
    words: 'scare more mobile text erupt flush paper snack despair goddess route solar keep search result author bounce pulp shine next butter unknown frozen trap',
    addresses: [
      'WTjhJXzQJETVx7BVXdyZmvk396DRRsubdw', // Miner rewards address
      'Wdf7xQtKDNefhd6KTS68Vna1u4wUAyHjLQ',
      'WaQf5igKpbdNyxTBzc3Nv8a8n4DRkcbpmX',
      'WYzcaxpK4x8XjZKkvcpb5CXKuEsfAsD3vD',
      'WjfMPKn7prjXUdzp7dFAxuDGreSTArnScE',
      'WVE1uwNor9Haitx2qGu9SB4uv4wVwGAWDP',
      'WbDaM4VGcWMBXPihJrViiYDphM7WoGDMWQ',
      'WgPiV4KvwaeKeRxj434ZjkvakX23hBhLyd',
      'We1t89h3YJuj9eU1SGfNwamk9FRBv3GhgD',
      'WeDLxQhv4vs4K8HVy4FUPBWSsN49rNYGKd',
      'WetZFhUkFqfv73k7AzcQm95vnRHCRzH7vQ',
      'WNgP5CEqhW4yMLjARi7JVMh9iapnUcTQtG',
      'WUr1RDAZVLY7w6M5M416uXLxpFekcXz1WH',
      'WexLCpMTBdgAbhH8Br2sCn6SPu44CZWSpK',
      'WWUdwEecrcFTdaFz1ZkeL1ZzyRg4YsvnY7',
      'WmpwqZg1KCQvBMxaE6BLgFrSv2AZS1FCw5',
      'WfiWuwxqcJMPSfjpDhqtRfW3sDg78hg34y',
      'Wh781JkXsumkTZKMKZmV4BjV8Nnjevkxkk',
      'Wb6792ceTDSJdySvQm7tikrNva4FRuVsUX',
      'WYZigDNfJ6x5T7VfVrgd1CtkKGfoBRRbyr',
      'WWGWrrUqpbP4ekx4zoNtBsrhCSEspxpDyA',
      'WgWfrJqAgS3RwzXMMz8fywidQAUx6a5smc'
    ]
  },
};

export const TOKEN_DATA = {
  HTR: 0,
  TOKEN: 1,

  /**
   * Checks if this token_data indicates this is an authority output, that is, if its 8th bit from
   * the right is 1.
   * @see https://github.com/HathorNetwork/rfcs/blob/master/text/0004-tokens.md#token_data-field
   * @param {number} tokenData "token_data" property from an output
   * @returns {boolean} True if this is an authority output
   */
  isAuthorityToken: tokenData => transactionUtils.isTokenDataAuthority(tokenData)

};

export const AUTHORITY_VALUE = {
  MINT: libConstants.TOKEN_MINT_MASK,
  MELT: libConstants.TOKEN_MELT_MASK
};

export const HATHOR_TOKEN_ID = '00';

export class TestUtils {
  /**
   * Returns the Supertest `request` object for this application
   * @returns {Test}
   */
  static get request() {
    return request;
  }

  /**
   * Whenever there is a request that depends on the last transactions' balance, there should be a
   * small pause to allow for the Fullnode's Websocket connection to update the Wallet Headless'
   * local caches.
   *
   * In localhost this time can be shorter, but we must allow for greater periods on GitHub's CI
   * workflow.
   *
   * The delay period here should be optimized for this purpose.
   * @returns {Promise<void>}
   */
  static async pauseForWsUpdate() {
    await delay(testConfig.wsUpdateDelay);
  }

  /**
   * Generates seed words for a new wallet
   * @returns {string|*}
   */
  static generateWords() {
    return wallet.generateWalletWords();
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
   * @returns {{success}|unknown}
   * @throws {TransactionErrorObject} Treated error object
   */
  static handleTransactionResponse(params) {
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
    await TestUtils.pauseForWsUpdate();
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
   * @param {string} [destinationWalletId] walletId of the destination address. Useful for debugging
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

    const transaction = TestUtils.handleTransactionResponse({
      methodName: 'injectFundsIntoAddress',
      requestBody,
      txResponse: response,
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

    await TestUtils.pauseForWsUpdate();

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
      .post('/wallet/tx-proposal/get-my-signatures')
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

    const transaction = TestUtils.handleTransactionResponse({
      methodName: 'consolidateUtxos',
      requestBody,
      txResponse: utxoResponse,
      dontLogErrors: params.dontLogErrors
    });

    TestUtils.log('UTXO consolidation', { requestBody, transaction });
    await TestUtils.pauseForWsUpdate();

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

    const transaction = TestUtils.handleTransactionResponse({
      methodName: 'createNft',
      requestBody,
      txResponse: nftResponse,
      dontLogErrors: params.dontLogErrors
    });

    TestUtils.log('NFT Creation', { requestBody, transaction });
    await TestUtils.pauseForWsUpdate();

    return transaction;
  }
}
