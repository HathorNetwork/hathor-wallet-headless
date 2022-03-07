import { loggers } from '../txLogger';
import { TestUtils, WALLET_CONSTANTS } from './test-utils-integration';

/**
 * A helper for testing the wallet
 */
export class WalletHelper {
  /**
   * Identification that will be used to start the wallet and as a reference on the request headers
   */
  #walletId;

  /**
   * 24-word seed for referencing the wallet
   */
  #words;

  /**
   * Some cached addresses to improve performance on tests
   * @type {string[]}
   */
  #addresses = [];

  /**
   * Indicates if the wallet was started in the Wallet Headless app
   * @type {boolean}
   */
  #started = false;

  get walletId() {
    return this.#walletId;
  }

  get words() {
    return this.#words;
  }

  get addresses() {
    return this.#addresses;
  }

  get started() {
    return this.#started;
  }

  /**
   * Creates a wallet object but does not start it on server
   * @param {string} walletId
   * @param {string} [words] 24 words
   */
  constructor(walletId, words) {
    if (!walletId) throw new Error(`Wallet must have a walletId`);
    this.#walletId = walletId;

    this.#words = words || TestUtils.generateWords();
  }

  /**
   * Starts this wallet and returns a formatted object with relevant wallet data.
   * Because the wallet takes time to instantiate, prefer the `startMultipleWalletsForTest` method.
   * @see startMultipleWalletsForTest
   * @param [options]
   * @param {boolean} [options.skipAddresses] Skips the getSomeAddresses command
   * @param {number} [options.amountOfAddresses=10] How many addresses should be cached (default 10)
   * @returns {Promise<WalletData>}
   */
  async start(options = {}) {
    await TestUtils.startWallet({
      walletId: this.#walletId,
      words: this.#words,
    });
    this.#started = true;

    // Populating some addressess for this wallet
    if (!options.skipAddresses) {
      const amount = options.amountOfAddresses || 10;
      for (let i = 0; i < amount; ++i) {
        const address = await TestUtils.getAddressAt(this.#walletId, i);
        this.#addresses.push(address);
      }
      await loggers.test.informWalletAddresses(this.#walletId, this.#addresses);
    }

    return {
      walletId: this.#walletId,
      words: this.#words,
      addresses: this.#addresses
    };
  }

  __setStarted() { this.#started = true; }

  /**
   * Starts all the wallets needed for the test suite.
   * <b>This is the preferred way of starting wallets</b> on the Integration Tests,
   * performance-wise.
   * @param {WalletHelper[]} walletsArr Array of WalletHelpers
   * @param [options]
   * @param {boolean} [options.skipAddresses] Skips the getSomeAddresses command
   * @param {number} [options.amountOfAddresses=10] How many addresses should be cached per wallet
   * @returns {Promise<void>}
   */
  static async startMultipleWalletsForTest(walletsArr, options) {
    const walletsPendingStart = {};

    // If the genesis wallet is not instantiated, start it. It should be always available
    const { genesis } = WALLET_CONSTANTS;
    const isGenesisStarted = await TestUtils.checkIfWalletIsReady(genesis.walletId);
    if (!isGenesisStarted) walletsArr.unshift(new WalletHelper(genesis.walletId, genesis.words));

    // Requests the start of all the wallets in quick succession
    for (const wallet of walletsArr) {
      await TestUtils.startWallet({
        walletId: wallet.walletId,
        words: wallet.words,
      }, {
        skipWait: true
      });
      walletsPendingStart[wallet.walletId] = wallet;
    }

    // Enters the loop checking each wallet for its status
    while (true) {
      const pendingWalletIds = Object.keys(walletsPendingStart);
      if (!pendingWalletIds.length) break; // All wallets were started. Return to the caller.

      // First we add a delay
      await TestUtils.delay(500);

      // Checking the status of each wallet
      for (const walletId of pendingWalletIds) {
        const isReady = await TestUtils.checkIfWalletIsReady(walletId);
        if (!isReady) continue;

        // If the wallet is ready, we remove it from the status check loop
        walletsPendingStart[walletId].__setStarted();
        delete walletsPendingStart[walletId];

        const addresses = await TestUtils.getSomeAddresses(walletId);
        await loggers.test.informWalletAddresses(walletId, addresses);
      }
    }
  }

  /**
   * Stops this wallet
   * @returns {Promise<void>}
   */
  async stop() {
    await TestUtils.stopWallet(this.#walletId);
    this.#started = false;
  }

  /**
   * Returns an address in the specified index for this wallet
   * @param {number} index Address index
   * @returns {Promise<string>}
   */
  async getAddressAt(index) {
    // If this address was already cached, return it
    if (this.#addresses[index] !== undefined) {
      return this.#addresses[index];
    }

    // Fetch data from the Headless endpoint, update the local cache and return results
    const addressAt = await TestUtils.getAddressAt(this.#walletId, index);
    this.#addresses[index] = addressAt;
    return addressAt;
  }

  /**
   * Retrieves address information based on the address index inside the wallet.
   * This is very close to the tests on `address-info.test.js` and as such should reflect any
   * changes that are made to the calls there.
   * @param {number} index Address index
   * @param {string} [token] Token hash, defaults to HTR
   * @returns {Promise<{
   * token: (string), index: (number),
   * total_amount_received: (number), total_amount_sent: (number),
   * total_amount_locked: (number), total_amount_available: (number)
   * }>}
   */
  async getAddressInfo(index, token) {
    const response = await TestUtils.request
      .get('/wallet/address-info')
      .query({
        address: await this.getAddressAt(index),
        token
      })
      .set({ 'x-wallet-id': this.#walletId });

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
   * Retrieves funds from the Genesis wallet and injects into this wallet at a specified address.
   * @param {number} value Value to be transferred
   * @param {number} [addressIndex=0] Address index. Defaults to 0
   * @param {FundInjectionOptions} [options]
   * @returns {Promise<{success}|*>}
   */
  async injectFunds(value, addressIndex = 0, options = {}) {
    if (!this.#started) {
      throw new Error(`Cannot inject funds: wallet ${this.#walletId} is not started.`);
    }
    const destinationAddress = await this.getAddressAt(addressIndex);
    return TestUtils.injectFundsIntoAddress(destinationAddress, value, this.#walletId, options);
  }

  /**
   * Creates a custom token on this wallet
   * @param params
   * @param {number} params.amount Amount of tokens to generate
   * @param {string} params.name Long name of the token
   * @param {string} params.symbol Token symbol
   * @param {string} [params.address] Destination address for the custom token
   * @param {string} [params.change_address] Destination address for the HTR change
   * @param {boolean} [params.doNotWait] Skip waiting after the transaction
   * @returns {Promise<unknown>} Token creation transaction
   */
  async createToken(params) {
    const { amount, name, symbol } = params;

    // Creating the request body from mandatory and optional parameters
    const tokenCreationBody = { name, symbol, amount };
    if (params.address) tokenCreationBody.address = params.address;
    if (params.change_address) tokenCreationBody.change_address = params.change_address;

    // Executing the request
    const newTokenResponse = await TestUtils.request
      .post('/wallet/create-token')
      .set({ 'x-wallet-id': this.#walletId })
      .send(tokenCreationBody);

    // Retrieving token data and building the Test Log message
    const tokenHash = newTokenResponse.body.hash;
    TestUtils.logTx('Token creation', {
      hash: tokenHash,
      walletId: this.#walletId,
      ...tokenCreationBody
    });

    const transaction = newTokenResponse.body;

    // Handling errors
    if (!transaction.success) {
      const injectError = new Error(transaction.message);
      injectError.innerError = newTokenResponse;
      throw injectError;
    }

    // Returning the Create Token transaction
    if (!params.doNotWait) {
      await TestUtils.delay(1000);
    }
    return transaction;
  }

  /**
   * Sends a transaction.
   *
   * @example
   * wallet.sendTx({
   *   destination: 'abc123',
   *   value: 100,
   *   token: 'def456'
   * })
   * @see https://wallet-headless.docs.hathor.network/#/paths/~1wallet~1simple-send-tx/post
   * @param options
   * @param {unknown} [options.fullObject] Advanced usage: a full body to send to post on 'send-tx'
   * @param {{hash:string,index:number,token?:string}[]} [options.inputs] Optional Inputs
   * @param {{address:string,value:number,token?:string}[]} [options.outputs] Complete Outputs
   * @param {string} [options.destination] Simpler way to inform output address instead of "outputs"
   * @param {number} [options.value] Simpler way to inform transfer value instead of "outputs"
   * @param {string} [options.token] Simpler way to inform transfer token instead of "outputs"
   * @param {string} [options.destinationWallet] Optional parameter to explain the funds destination
   * @param {string} [options.change_address] Optional parameter to set the change address
   * @param {boolean} [options.doNotWait] If true, the response will be returned immediately
   * @returns {Promise<unknown>} Returns the transaction
   */
  async sendTx(options) {
    const sendOptions = options.fullObject || {};
    if (options.inputs) {
      sendOptions.inputs = options.inputs;
    }
    if (options.outputs) {
      sendOptions.outputs = options.outputs;
    } else if (options.destination && options.value) {
      const sendObj = {
        address: options.destination,
        value: options.value,
      };
      if (options.token) {
        sendObj.token = options.token;
      }
      sendOptions.outputs = [sendObj];
    }
    if (options.change_address) {
      sendOptions.change_address = options.change_address;
    }

    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send(sendOptions)
      .set(TestUtils.generateHeader(this.#walletId));

    // Error handling
    const transaction = response.body;
    if (!transaction.success) {
      const txError = new Error(transaction.message);
      txError.innerError = response;
      throw txError;
    }

    // Logs the results
    const metadata = {
      originWallet: this.#walletId,
      hash: transaction.hash,
      ...sendOptions
    };
    if (options.destinationWallet) metadata.destinationWallet = options.destinationWallet;
    await loggers.test.insertLineToLog(`Transferring funds`, metadata);

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
