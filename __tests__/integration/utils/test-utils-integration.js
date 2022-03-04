/* eslint-disable no-console */

import supertest from 'supertest';
import { wallet, HathorWallet } from '@hathor/wallet-lib';
import app from '../../../src';
import { loggers } from '../txLogger';

const request = supertest(app);

/**
 * @typedef WalletData
 * @property {string} walletId Id for interacting with the wallet
 * @property {string} words 24 word seed for the wallet
 * @property {string[]} [addresses] Some sample addresses to help with testing
 */

/**
 * @typedef FundInjectionOptions
 * @property {boolean} [doNotWait] If true, will not wait a while for the transaction
 *  to "settle" on the fullnode
 */

/**
 * @type {Record<string,WalletData>}
 */
export const WALLET_CONSTANTS = {
  genesis: {
    walletId: 'genesiswallet',
    words: 'avocado spot town typical traffic vault danger century property shallow divorce festival spend attack anchor afford rotate green audit adjust fade wagon depart level',
    addresses: [
      'WY1URKUnqCTyiixW1Dw29vmeG99hNN4EW6', // Genesis funds, index 1
      'WRTFYzhTHkfYwub8EWVtAcUgbdUpsYMBpb', // Miner rewards, index 2
      'WhpJeUtBLrDHbKDoMC9ffMxwHqvsrNzTFV', // index 3
    ]
  },
  second: {
    walletId: 'secondwallet',
    words: 'scare more mobile text erupt flush paper snack despair goddess route solar keep search result author bounce pulp shine next butter unknown frozen trap',
    addresses: [
      'WTjhJXzQJETVx7BVXdyZmvk396DRRsubdw',
      'Wdf7xQtKDNefhd6KTS68Vna1u4wUAyHjLQ',
      'WaQf5igKpbdNyxTBzc3Nv8a8n4DRkcbpmX',
    ]
  },
};

export const HATHOR_TOKEN_ID = '00';

/**
 * Generates a random positive integer between the maximum and minimum values,
 * with the default minimum equals zero
 * @param {number} max
 * @param {number} [min=0]
 * @returns {number} Random number
 */
export function getRandomInt(max, min = 0) {
  const _min = Math.ceil(min);
  const _max = Math.floor(max);
  return Math.floor(Math.random() * (_max - _min + 1)) + _min;
}

export class TestUtils {
  /**
   * Simple way to wait asynchronously before continuing the funcion. Does not block the JS thread.
   * @param {number} ms Amount of milliseconds to delay
   * @returns {Promise<unknown>}
   */
  static async delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Returns the Supertest `request` object for this application
   * @returns {Test}
   */
  static get request() {
    return request;
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
   * @returns {{"x-wallet-id"}}
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
   */
  static logTx(message, metadata) {
    loggers.test.insertLineToLog(message, metadata);
  }

  /**
   * Logs a custom error message to the correct output to be analyzed later
   * @param {string} message Custom error message
   */
  static logError(message) {
    console.error(message);
  }

  /**
   * Starts a wallet. Prefer instantiating a WalletHelper instead.
   * @param {WalletData} walletObj
   * @param [options]
   * @param {boolean} [options.skipWait] If true, skips the wallet status validation
   * @returns {Promise<{start:unknown,status:unknown}>}
   */
  static async startWallet(walletObj, options = {}) {
    // Request the Wallet start
    const response = await request
      .post('/start')
      .send({ seed: walletObj.words, 'wallet-id': walletObj.walletId });

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
    let status;
    while (!options.skipWait) {
      const walletReady = await TestUtils.checkIfWalletIsReady(walletObj.walletId);
      if (walletReady) {
        status = true;
        break;
      }
      await TestUtils.delay(500);
    }

    // Log the success and return
    loggers.test.informNewWallet(walletObj.walletId, walletObj.words);

    return { start, status };
  }

  static async checkIfWalletIsReady(walletId) {
    const res = await request
      .get('/wallet/status')
      .set(TestUtils.generateHeader(walletId));

    return res.body?.statusCode === HathorWallet.READY;
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
   * Gets the address from a walletId and an index, using the Wallet Headless endpoint
   * @param {string} walletId
   * @param {number} index
   * @returns {Promise<string>}
   */
  static async getAddressAt(walletId, index) {
    const response = await TestUtils.request
      .get('/wallet/address')
      .query({ index })
      .set(TestUtils.generateHeader(walletId));

    return response.body.address;
  }

  /**
   * Get the next addresses on this wallet that do not have transactions.
   * The amount of addresses is the current gap limit.
   * @param {string} walletId
   * @returns {Promise<string[]>}
   */
  static async getSomeAddresses(walletId) {
    const response = await TestUtils.request
      .get('/wallet/addresses')
      .set(TestUtils.generateHeader(walletId));

    if (!response.body.addresses) throw new Error(response.text);
    return response.body.addresses;
  }

  /**
   * Transfers funds to a destination address.
   * By default, this method also waits for a second to let the indexes build before returning.
   * @param {string} address Destination address
   * @param {number} value Amount of tokens, in cents
   * @param {string} [destinationWalletId] walletId of the destination address. Useful for debugging
   * @param {FundInjectionOptions} [options]
   * @returns {Promise<unknown>}
   */
  static async injectFundsIntoAddress(address, value, destinationWalletId, options = {}) {
    // Requests the transaction
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({ address, value })
      .set(TestUtils.generateHeader(WALLET_CONSTANTS.genesis.walletId));

    // Error handling
    const transaction = response.body;
    if (!transaction.success) {
      const injectError = new Error(transaction.message);
      injectError.innerError = response;
      throw injectError;
    }

    // Logs the results
    await loggers.test.informSimpleTransaction({
      title: `Injecting funds`,
      originWallet: WALLET_CONSTANTS.genesis.walletId,
      value,
      destinationAddress: address,
      destinationWallet: destinationWalletId,
      id: transaction.hash
    });

    /*
     * The balance in the storage is updated after the wallet receives a message via websocket
     * from the full node. A simple wait is built here to allow for this message before continuing.
     *
     * In case there is a need to do multliple transactions before any assertion is executed,
     * please use the `doNotWait` option and explicitly insert the delay only once.
     * This will improve the test speed.
     */
    if (!options.doNotWait) {
      await TestUtils.delay(1000);
    }

    return transaction;
  }
}
