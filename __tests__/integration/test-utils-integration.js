import supertest from "supertest";
import app from "../../src";
import {wallet} from '@hathor/wallet-lib';
import {loggers} from "./txLogger";

const request = supertest(app);

function generateHeader(walletId) {
  return { "x-wallet-id": walletId }
}


// const wsUrl = config.server.replace(/https?/, "ws").replace("/v1a", "/v1a/ws");

/**
 * @typedef WalletData
 * @property {string} walletId Id for interacting with the wallet
 * @property {string} words 24 word seed for the wallet
 * @property {string[]} [addresses] Some sample addresses to help with testing
 */

/**
 * @type {Record<string,WalletData>}
 */
export const WALLET_CONSTANTS = {
  genesis: {
    walletId: 'genesiswallet',
    words: 'avocado spot town typical traffic vault danger century property shallow divorce festival spend attack anchor afford rotate green audit adjust fade wagon depart level',
    addresses: [
      'WY1URKUnqCTyiixW1Dw29vmeG99hNN4EW6', // Genesis funds
      'WRTFYzhTHkfYwub8EWVtAcUgbdUpsYMBpb', // Miner rewards
      'WhpJeUtBLrDHbKDoMC9ffMxwHqvsrNzTFV', // First without transactions
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
  third: {
    walletId: 'thirdwallet',
    words: 'route grab truth degree ketchup scene alone bulk usage pumpkin radio silk replace legal excuse cube pudding blush document nature used rough steak immune',
    addresses: []
  }
}

export function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export class TestUtils {
  static async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static get request() {
    return request;
  }

  static generateWords() {
    return wallet.generateWalletWords()
  }

  static generateHeader(walletId) {
    return generateHeader(walletId)
  }

  /**
   *
   * @param {WalletData} walletObj
   * @returns {Promise<{start:unknown,status:unknown}>}
   */
  static async startWallet(walletObj) {
    let start, status

    // Start the wallet
    const response = await request
      .post("/start")
      .send({ seed: walletObj.words, "wallet-id": walletObj.walletId });

    if (response.status !== 200) {
      throw new Error(`Unable to start the wallet: ${walletObj.walletId}`);
    }
    if (!response.body.success) {
      console.error(`Failure starting the wallet: ${response.body.message}`)
      throw new Error(response.body.message);
    }
    start = response.body

    // Wait until the wallet is actually started
    while (true) {
      const res = await request
        .get("/wallet/status")
        .set(generateHeader(walletObj.walletId));
      if (res.body && res.body.success !== false) {
        status = res.body
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    loggers.test.informNewWallet(walletObj.walletId, walletObj.words)
      .catch(err => console.error(err.stack))

    return { start, status }
  }

  static async stopWallet(walletId) {
    await request.post("/wallet/stop").set(generateHeader(walletId));
  }

  /**
   *
   * @param walletId
   * @param index
   * @returns {Promise<string>}
   */
  static async getAddressAt(walletId, index) {
    const response = await TestUtils.request
      .get("/wallet/address")
      .query({ index })
      .set(generateHeader(walletId));

    return response.body.address
  }

  /**
   *
   * @param {string} address Destination address
   * @param {number} value Amount of tokens, in cents
   * @param {string} [destinationWalletId] walletId of the destination address. Useful for debugging.
   // * @returns {Promise<void>}
   */
  static async injectFundsIntoAddress(address, value, destinationWalletId) {
    const response = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({address,value})
      .set(generateHeader(WALLET_CONSTANTS.genesis.walletId));

    const transaction = response.body;
    if (!transaction.success) {
      const injectError = new Error(transaction.message)
      injectError.innerError = response
      throw injectError
    }

    await loggers.test.informSimpleTransaction({
      title: `Injecting funds`,
      originWallet: WALLET_CONSTANTS.genesis.walletId,
      value,
      destinationAddress: address,
      destinationWallet: destinationWalletId,
      id: transaction.hash
    })
    return transaction
  }
}

/**
 * A helper for testing the wallet
 */
export class WalletHelper {
  #walletId
  #words
  #addresses = []
  #started = false

  get walletId() { return this.#walletId }
  get words() { return this.#words }
  get addresses() { return this.#addresses }

  /**
   * Creates a wallet object but does not start it on server
   * @param {string} walletId
   * @param {string} [words] 24 words
   */
  constructor(walletId, words) {
    if (!walletId) throw new Error(`Wallet must have a walletId`)
    this.#walletId = walletId

    if (words) this.#words = words
    else this.#words = TestUtils.generateWords()
  }

  /**
   * Starts this wallet and returns a formatted object with relevant wallet data
   * @param [options]
   * @param {boolean} [options.skipAddresses] Skips the getSomeAddresses command
   * @param {number} [options.amountOfAddresses=10] How many addresses should be cached ( default 10 )
   * @returns {Promise<WalletData>}
   */
  async start(options = {}) {
    await TestUtils.startWallet({
      walletId: this.#walletId,
      words: this.#words,
    })
    this.#started = true

    // Populating some addressess for this wallet
    if (!options.skipAddresses) {
      const amount = options.amountOfAddresses || 10
      for (let i = 0; i < amount; ++i) {
        const address = await TestUtils.getAddressAt(this.#walletId, i)
        this.#addresses.push(address)
      }
      loggers.test.informWalletAddresses(this.#walletId, this.#addresses).catch(e => console.error(e.stack))
    }

    return {
      walletId: this.#walletId,
      words: this.#words,
      addresses: this.#addresses
    }
  }

  /**
   * Stops this wallet
   * @returns {Promise<void>}
   */
  async stop() {
    await TestUtils.stopWallet(this.#walletId)
    this.#started = false
  }

  /**
   * Returns an address in the specified index for this wallet
   * @param {number} index Address index
   * @returns {Promise<string>}
   */
  getAddressAt(index) {
    if (this.#addresses[index] !== undefined) {
      console.info(`Cache hit! ${this.#walletId}[${index}]: ${this.#addresses[index]}`)
      return this.#addresses[index]
    }
    return TestUtils.getAddressAt(this.#walletId,index)
  }
}
