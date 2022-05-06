import { loggers } from '../txLogger';
import { TestUtils, WALLET_CONSTANTS } from './test-utils-integration';
import testConfig from '../configuration/test.config';

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
   * seedKey referencing a preconfigured multisig on the wallet-headless
   */
  #seedKey;

  /**
   * boolean indicating this is a MultiSig Wallet
   * XXX: We currently do not support starting a multisig wallet from `words`
   *
   * @type {boolean}
   */
  #multisig;

  /**
   * Some cached addresses to improve performance on tests
   * @type {string[]}
   */
  #addresses = [];

  /**
   * Creates a wallet object but does not start it on server
   * @param {string} walletId
   * @param [options]
   * @param {string} [options.words] 24 words, optional
   * @param {string} [options.seedKey] seedKey, optional
   * @param {boolean} [options.multisig] If the wallet is multisig, defaults to false
   */
  constructor(walletId, options = {}) {
    if (!walletId) {
      throw new Error('Wallet must have a walletId');
    }
    this.#walletId = walletId;

    if (options.multisig && !options.seedKey) {
      throw new Error('A MultiSig Wallet must be instantiated from a seedKey');
    }

    if (options.words) {
      // When words are available, use them
      this.#words = options.words;
      this.#seedKey = null;
      this.#multisig = false;
    } else if (options.seedKey) {
      // Starting from seedKey
      this.#words = null;
      this.#seedKey = options.seedKey;
      this.#multisig = options.multisig || false;
    } else {
      // No words or seedKey, start from random words
      this.#words = TestUtils.generateWords();
      this.#seedKey = null;
      this.#multisig = false;
    }
  }

  get walletId() {
    return this.#walletId;
  }

  get words() {
    return this.#words;
  }

  get seedKey() {
    return this.#seedKey;
  }

  get addresses() {
    return this.#addresses;
  }

  get multisig() {
    return this.#multisig || false;
  }

  get walletData() {
    if (this.words) {
      return {
        walletId: this.walletId,
        words: this.words,
        addresses: this.addresses || [],
      };
    }

    if (this.seedKey) {
      return {
        walletId: this.walletId,
        seedKey: this.seedKey,
        multisig: this.multisig,
        addresses: this.addresses || [],
      };
    }

    throw new Error('Both [`words`, `seedKey`] are missing from the WalletHelper');
  }

  /**
   * Starts all the wallets needed for the test suite.
   * <b>This is the preferred way of starting wallets</b> on the Integration Tests,
   * performance-wise.
   * @param {WalletHelper[]} walletsArr Array of WalletHelpers
   * @param [options]
   * @param {boolean} [options.serial] Start one wallet at a time
   * @returns {Promise<void>}
   */
  static async startMultipleWalletsForTest(walletsArr, options = {}) {
    /**
     * A map of `WalletHelper`s indexed by their `walletId`s
     * @type {Record<string,WalletHelper>}
     */
    const walletsPendingReady = {};

    /*
     * This benchmark is separated in three phases:
     * - The HTTP requests to `/start`, to initialize each wallet (startRequests)
     * - The waiting loop to confirm via `/status` each wallet is really started (confirmReadyLoop)
     * - The full time for this process on all wallets
     *
     * Aside from the global time counters, each wallet has is own time marks, since they may be
     * started serially instead of in parallel:
     * - startRequestBegin and startRequestEnd properties measure the initial http request
     * - isReady measures the second confirmation of the wallet being initialized
     * - walletReadyDuration measures the time since the first startRequest above
     */
    const startBenchmark = {
      startRequestsBegin: 0,
      startRequestsEnd: 0,
      startRequestsDuration: 0,

      confirmReadyLoopEnd: 0,
      confirmReadyLoopDuration: 0,

      fullProcessDuration: 0,
      wallets: {}
    };

    // If the genesis wallet is not instantiated, start it. It should be always available
    const { genesis } = WALLET_CONSTANTS;
    const isGenesisStarted = await TestUtils.isWalletReady(genesis.walletId);
    if (!isGenesisStarted) {
      walletsArr.unshift(new WalletHelper(genesis.walletId, { words: genesis.words }));
    }

    // Start of the requests
    startBenchmark.startRequestsBegin = Date.now().valueOf();

    if (options.serial || walletsArr.length > 2) {
      // If we need to initialize too many wallets at once, it's better to do it serially
      for (const wallet of walletsArr) {
        const walletBenchmark = {};
        walletBenchmark.startRequestBegin = Date.now().valueOf();
        await TestUtils.startWallet(wallet.walletData, {
          waitWalletReady: true
        });
        walletBenchmark.startRequestEnd = Date.now().valueOf();
        walletBenchmark.diffRequest = walletBenchmark.startRequestEnd
          - walletBenchmark.startRequestBegin;
        startBenchmark.wallets[wallet.walletId] = walletBenchmark;
      }
    } else {
      // Requests the start of all the wallets in quick succession - parallel mode
      const startPromisesArray = [];
      for (const wallet of walletsArr) {
        const promise = TestUtils.startWallet(wallet.walletData);
        walletsPendingReady[wallet.walletId] = wallet;
        const walletBenchmark = {};
        walletBenchmark.startRequestBegin = Date.now().valueOf();
        startBenchmark.wallets[wallet.walletId] = walletBenchmark;
        startPromisesArray.push(promise);
      }
      await Promise.all(startPromisesArray);
    }

    startBenchmark.startRequestsEnd = Date.now().valueOf();
    startBenchmark.startRequestsDuration = startBenchmark.startRequestsEnd
                                          - startBenchmark.startRequestsBegin;

    // Enters the loop checking each wallet for its status
    const loopTimeout = startBenchmark.startRequestsBegin + testConfig.walletStartTimeout;
    while (true) {
      const pendingWalletIds = Object.keys(walletsPendingReady);
      // If all wallets were started, return to the caller.
      if (!pendingWalletIds.length) {
        break;
      }

      // If this process took too long, the connection with the fullnode may be irreparably broken.
      const timestamp = Date.now().valueOf();
      if (timestamp > loopTimeout) {
        const failureDiff = timestamp - startBenchmark.startRequestsEnd;
        const errMsg = `Wallet init failure: Timeout on ${failureDiff}ms.`;
        TestUtils.logError(errMsg);
        startBenchmark.failureAt = timestamp;
        startBenchmark.failureDiff = failureDiff;
        TestUtils.log(`Wallet init failure`, startBenchmark);
        throw new Error(errMsg);
      }

      // First we add a delay
      await TestUtils.delay(1000);

      // Checking the status of each wallet that has not been confirmed ready
      for (const walletId of pendingWalletIds) {
        const isReady = await TestUtils.isWalletReady(walletId);
        if (!isReady) {
          continue;
        }

        // If the wallet is ready, we remove it from the status check loop
        const timestampReady = Date.now().valueOf();
        delete walletsPendingReady[walletId];

        const walletBenchmark = startBenchmark.wallets[walletId];
        walletBenchmark.isReady = timestampReady;
        walletBenchmark.walletReadyDuration = walletBenchmark.startRequestEnd
          ? timestampReady - walletBenchmark.startRequestEnd // Serial
          : timestampReady - startBenchmark.startRequestsEnd; // Parallel

        const addresses = await TestUtils.getSomeAddresses(walletId);
        await loggers.test.informWalletAddresses(walletId, addresses);
      }
    }

    startBenchmark.confirmReadyLoopEnd = Date.now().valueOf();
    startBenchmark.confirmReadyLoopDuration = startBenchmark.confirmReadyLoopEnd
                                              - startBenchmark.startRequestsEnd;
    startBenchmark.fullProcessDuration = startBenchmark.confirmReadyLoopEnd
                                         - startBenchmark.startRequestsBegin;
    TestUtils.log(`Finished multiple wallet initialization.`, startBenchmark);
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
    await TestUtils.startWallet(this.walletData, { waitWalletReady: true });

    // Populating some addressess for this wallet
    if (!options.skipAddresses) {
      const amount = options.amountOfAddresses || 10;
      for (let i = 0; i < amount; ++i) {
        const address = await TestUtils.getAddressAt(this.#walletId, i);
        this.#addresses.push(address);
      }
      await loggers.test.informWalletAddresses(this.#walletId, this.#addresses);
    }

    return this.walletData;
  }

  /**
   * Stops this wallet
   * @returns {Promise<void>}
   */
  async stop() {
    await TestUtils.stopWallet(this.#walletId);
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
   * @param {boolean} [markAsUsed=false] If true, marks this address as used
   * @returns {Promise<string>}
   */
  async getNextAddress(markAsUsed = false) {
    return TestUtils.getAddressAt(this.#walletId, undefined, markAsUsed);
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
   * @param {boolean} [params.dontLogErrors] Skip logging errors.
   * @returns {Promise<unknown>} Token creation transaction
   *
   * XXX: not supported for multisig
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

    const transaction = TestUtils.handleTransactionResponse({
      methodName: 'createToken',
      requestBody: tokenCreationBody,
      txResponse: newTokenResponse,
      dontLogErrors: params.dontLogErrors
    });

    TestUtils.log('Token Creation', {
      hash: transaction.hash,
      walletId: this.#walletId,
      ...tokenCreationBody
    });

    await TestUtils.pauseForWsUpdate();

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
   * @property {string} [address] Optional Destination address hash.
   *                              Required if output script is not a data script.
   * @property {number} [value] Optional Amount of tokens to transfer on this output.
   *                            Required if output script is not a data script.
   * @property {string} [token] Optional token hash. Defaults to HTR
   * @property {string} [type] Optional output type. Required if output script is a data script.
   * @property {string} [data] Optional data script. Required if output script is a data script.
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
   * @param {string} [options.title] Optional title describing the transaction's context
   * @param {unknown} [options.fullObject] Advanced usage: a full body to send to post on 'send-tx'
   * @param {SendTxInputParam[]} [options.inputs] Optional Inputs
   * @param {SendTxOutputParam[]} [options.outputs] Complete Outputs
   * @param {string} [options.destination] Simpler way to inform output address instead of "outputs"
   * @param {number} [options.value] Simpler way to inform transfer value instead of "outputs"
   * @param {string} [options.token] Simpler way to inform transfer token instead of "outputs"
   * @param {string} [options.destinationWallet] Optional parameter to explain the funds destination
   * @param {string} [options.change_address] Optional parameter to set the change address
   * @param {boolean} [options.dontLogErrors] Skip logging errors.
   * @returns {Promise<unknown>} Returns the transaction
   *
   * XXX: not supported for multisig
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

    const transaction = TestUtils.handleTransactionResponse({
      methodName: 'sendTx',
      requestBody: sendOptions,
      txResponse: response,
      dontLogErrors: options.dontLogErrors
    });

    // Logs the results
    const metadata = {
      originWallet: this.#walletId,
      hash: transaction.hash,
      ...sendOptions
    };
    if (options.title) {
      metadata.title = options.title;
    }
    if (options.destinationWallet) {
      metadata.destinationWallet = options.destinationWallet;
    }
    await TestUtils.log('send-tx', metadata);

    await TestUtils.pauseForWsUpdate();

    return transaction;
  }

  async getTxHistory() {
    return TestUtils.getTxHistory(this.#walletId);
  }

  async getBalance(tokenUid = null) {
    return TestUtils.getBalance(this.#walletId, tokenUid);
  }

  /**
   * Get this wallet signatures for the transaction.
   *
   * @param {string} [txHex] hex encoded transaction.
   * @returns {Promise<string>} Promise to return the signatures.
   *
   * XXX: currently only supported for multisig
   */
  async getSignatures(txHex) {
    return TestUtils.getSignatures(txHex, this.#walletId);
  }

  /**
   * Makes a request to get UTXO's for a specific query.
   *
   * @param [params]
   * @param {number} [params.max_utxos] Maximum amount of results
   * @param {string} [params.token] Custom token to filter
   * @param {string} [params.filter_address] Specific address to filter
   * @param {number} [params.amount_smaller_than] Filter only UTXO's with value <= this parameter
   * @param {number} [params.amount_bigger_than] Filter only UTXO's with value >= this parameter
   * @param {number} [params.maximum_amount] Maximum amount of summed values
   * @param {boolean} [params.only_available] Filter only unlocked UTXOs
   * @returns {Promise<FilterUtxosResponse>}
   */
  async getUtxos(params) {
    return TestUtils.getUtxos({ ...params, walletId: this.#walletId });
  }

  /**
   * Consolidates UTXO's
   * @param [params]
   * @param {string} [params.destination_address] Address that will receive the funds
   * @param {number} [params.max_utxos] Maximum amount of source utxos used
   * @param {string} [params.token] Custom token to filter
   * @param {string} [params.filter_address] Specific address to filter for inputs
   * @param {string} [params.amount_smaller_than] Filter only UTXO's with value <= this parameter
   * @param {string} [params.amount_bigger_than] Filter only UTXO's with value >= this parameter
   * @param {string } [params.maximum_amount] Maximum amount of summed values
   * @param {boolean} [params.dontLogErrors] Skip logging errors.
   * @returns {Promise<FilterUtxosResponse>}
   */
  async consolidateUtxos(params) {
    return TestUtils.consolidateUtxos({ ...params, walletId: this.#walletId });
  }

  /**
   * Creates NFT's
   * @param params
   * @param {string} params.name Token name
   * @param {string} params.symbol Token symbol
   * @param {number} params.amount Token amount
   * @param {string} params.data Token data
   * @param {string} [params.address] Token destination address
   * @param {string} [params.change_address] Change address for the minting HTR
   * @param {boolean} [params.create_mint] Determines if the mint authority will be created
   * @param {boolean} [params.create_melt] Determines if the melt authority will be created
   * @param {boolean} [params.dontLogErrors] Skip logging errors.
   * @returns {Promise<{success}|*>}
   */
  async createNft(params) {
    return TestUtils.createNft({ ...params, walletId: this.#walletId });
  }
}
