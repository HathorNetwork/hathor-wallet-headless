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

  /**
   * Creates a wallet object but does not start it on server
   * @param {string} walletId
   * @param {string} [words] 24 words
   */
  constructor(walletId, words) {
    if (!walletId) {
      throw new Error('Wallet must have a walletId');
    }
    this.#walletId = walletId;

    this.#words = words || TestUtils.generateWords();
  }

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
    /**
     * A map of `WalletHelper`s indexed by their `walletId`s
     * @type {Record<string,WalletHelper>}
     */
    const walletsPendingReady = {};

    // If the genesis wallet is not instantiated, start it. It should be always available
    const { genesis } = WALLET_CONSTANTS;
    const isGenesisStarted = await TestUtils.isWalletReady(genesis.walletId);
    if (!isGenesisStarted) {
      walletsArr.unshift(new WalletHelper(genesis.walletId, genesis.words));
    }

    // Requests the start of all the wallets in quick succession
    for (const wallet of walletsArr) {
      await TestUtils.startWallet({
        walletId: wallet.walletId,
        words: wallet.words,
      });
      walletsPendingReady[wallet.walletId] = wallet;
    }

    // Enters the loop checking each wallet for its status
    while (true) {
      const pendingWalletIds = Object.keys(walletsPendingReady);
      if (!pendingWalletIds.length) {
        break;
      } // All wallets were started. Return to the caller.

      // First we add a delay
      await TestUtils.delay(500);

      // Checking the status of each wallet
      for (const walletId of pendingWalletIds) {
        const isReady = await TestUtils.isWalletReady(walletId);
        if (!isReady) {
          continue;
        }

        // If the wallet is ready, we remove it from the status check loop
        walletsPendingReady[walletId].__setStarted();
        delete walletsPendingReady[walletId];

        const addresses = await TestUtils.getSomeAddresses(walletId);
        await loggers.test.informWalletAddresses(walletId, addresses);
      }
    }
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
    await TestUtils.startWallet(
      {
        walletId: this.#walletId,
        words: this.#words,
      },
      { waitWalletReady: true }
    );
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
   * Returns the next address without transactions for this wallet
   * @returns {Promise<string>}
   */
  async getNextAddress() {
    return TestUtils.getAddressAt(this.#walletId);
  }

  /**
   * Retrieves address information based on the address index inside the wallet.
   * @param {number} index Address index
   * @param {string} [token] Token hash, defaults to HTR
   * @returns {Promise<{
   * token: (string), index: (number),
   * total_amount_received: (number), total_amount_sent: (number),
   * total_amount_locked: (number), total_amount_available: (number)
   * }>}
   */
  async getAddressInfo(index, token) {
    const address = await this.getAddressAt(index);

    return TestUtils.getAddressInfo(address, this.#walletId, token);
  }

  /**
   * Retrieves funds from the Genesis wallet and injects into this wallet at a specified address.
   * @param {number} value Value to be transferred
   * @param {number} [addressIndex=0] Address index. Defaults to 0
   * @returns {Promise<{success}|*>}
   */
  async injectFunds(value, addressIndex = 0) {
    if (!this.#started) {
      throw new Error(`Cannot inject funds: wallet ${this.#walletId} is not started.`);
    }
    const destinationAddress = await this.getAddressAt(addressIndex);
    return TestUtils.injectFundsIntoAddress(destinationAddress, value, this.#walletId);
  }

  /**
   * Creates a custom token on this wallet
   * @param params
   * @param {number} params.amount Amount of tokens to generate
   * @param {string} params.name Long name of the token
   * @param {string} params.symbol Token symbol
   * @param {string} [params.address] Destination address for the custom token
   * @param {string} [params.change_address] Destination address for the HTR change
   * @returns {Promise<unknown>} Token creation transaction
   */
  async createToken(params) {
    const { amount, name, symbol } = params;

    // Creating the request body from mandatory and optional parameters
    const tokenCreationBody = { name, symbol, amount };
    if (params.address) {
      tokenCreationBody.address = params.address;
    }
    if (params.change_address) {
      tokenCreationBody.change_address = params.change_address;
    }

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

    return transaction;
  }

  /**
   * @typedef SendTxInputParam
   * @property {string} [hash] UTXO transaction hash
   * @property {number} [index] UTXO output index
   * @property {string} [token] Optional token hash. Defaults to HTR
   * @property {'query'} [type] Optional command instead of a UTXO
   * @property {string} [filter_address] Optional command data
   * @see The source code for route /wallet/send-tx
   * @example
   * { hash: '123abc', index: 0 }
   * { hash: '123abc', index: 1, token: '234def' }
   * { type: 'query', filter_address: '567acf' }
   */

  /**
   * @typedef SendTxOutputParam
   * @property {string} [address] Destination address hash
   * @property {number} [value] Amount of tokens to transfer on this output
   * @property {string} [token] Optional token hash. Defaults to HTR
   */

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
   * @param {SendTxInputParam[]} [options.inputs] Optional Inputs
   * @param {SendTxOutputParam[]} [options.outputs] Complete Outputs
   * @param {string} [options.destination] Simpler way to inform output address instead of "outputs"
   * @param {number} [options.value] Simpler way to inform transfer value instead of "outputs"
   * @param {string} [options.token] Simpler way to inform transfer token instead of "outputs"
   * @param {string} [options.destinationWallet] Optional parameter to explain the funds destination
   * @param {string} [options.change_address] Optional parameter to set the change address
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
      txError.sendOptions = sendOptions;
      throw txError;
    }

    // Logs the results
    const metadata = {
      originWallet: this.#walletId,
      hash: transaction.hash,
      ...sendOptions
    };
    if (options.destinationWallet) {
      metadata.destinationWallet = options.destinationWallet;
    }
    await loggers.test.insertLineToLog('Transferring funds', metadata);

    return transaction;
  }

  async getTxHistory() {
    return TestUtils.getTxHistory(this.#walletId);
  }

  async getBalance(tokenUid = null) {
    return TestUtils.getBalance(this.#walletId, tokenUid);
  }
}
