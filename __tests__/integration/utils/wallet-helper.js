import { loggers } from './logger.util';
import { TestUtils } from './test-utils-integration';
import { WALLET_CONSTANTS } from '../configuration/test-constants';
import { WalletBenchmarkUtil } from './benchmark/wallet-benchmark.util';
import { TxTimeHelper } from './benchmark/tx-time.helper';
import { precalculationHelpers } from '../../../scripts/helpers/wallet-precalculation.helper';

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
   * @param {string[]} [options.preCalculatedAddresses] Pre-calculated addresses, for performance
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

    if (options.preCalculatedAddresses) {
      this.#addresses = options.preCalculatedAddresses;
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
   * Creates a WalletHelper instance with precalculated addresses from a local storage.
   * @param {string} walletId Mandatory identification for the headless app
   * @returns {WalletHelper}
   */
  static getPrecalculatedWallet(walletId) {
    const precalculatedWallet = precalculationHelpers.test.getPrecalculatedWallet();
    return new WalletHelper(walletId, {
      words: precalculatedWallet.words,
      preCalculatedAddresses: precalculatedWallet.addresses
    });
  }

  /**
   * Starts all the wallets needed for the test suite.
   * <b>This is the preferred way of starting wallets</b> on the Integration Tests,
   * performance-wise.
   * @param {WalletHelper[]} walletsArr Array of WalletHelpers
   * @returns {Promise<void>}
   */
  static async startMultipleWalletsForTest(walletsArr) {
    // If the genesis wallet is not instantiated, start it. It should be always available
    const { genesis } = WALLET_CONSTANTS;
    const isGenesisStarted = await TestUtils.isWalletReady(genesis.walletId);
    if (!isGenesisStarted) {
      walletsArr.unshift(new WalletHelper(genesis.walletId, {
        words: genesis.words,
        preCalculatedAddresses: genesis.addresses,
      }));
    }

    // First request each wallet to be started, with a small pause between each request
    const walletsPendingReady = {};
    for (const wallet of walletsArr) {
      await TestUtils.startWallet(wallet.walletData, { waitWalletReady: true });
      walletsPendingReady[wallet.walletId] = wallet;
    }

    // Benchmark summary and finishing log
    const walletsBenchmark = WalletBenchmarkUtil.calculateSummary(walletsArr.map(w => w.walletId));
    TestUtils.log(`Finished multiple wallet initialization.`, walletsBenchmark);
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
    const txTimeHelper = new TxTimeHelper('create-token');
    const newTokenResponse = await TestUtils.request
      .post('/wallet/create-token')
      .set({ 'x-wallet-id': this.#walletId })
      .send(tokenCreationBody);
    txTimeHelper.informResponse(newTokenResponse.body.hash);

    const transaction = await TestUtils.handleTransactionResponse({
      methodName: 'createToken',
      requestBody: tokenCreationBody,
      txResponse: newTokenResponse,
      dontLogErrors: params.dontLogErrors,
      walletIdsToWait: [this.#walletId],
    });

    TestUtils.log('Token Creation', {
      hash: transaction.hash,
      walletId: this.#walletId,
      ...tokenCreationBody
    });

    return transaction;
  }

  /**
   * Build a create-token transaction proposal.
   *
   * @param params
   * @param {string} params.name Long name of the token
   * @param {string} params.symbol Token symbol
   * @param {number} params.amount of tokens to generate
   * @param {string} [params.address] Destination address for the custom token
   * @returns {Promise<string>} txHex as the transaction proposal
   *
   * XXX: only supports multisig
   */
  async buildCreateToken(params) {
    if (!this.#multisig) {
      throw new Error('The wallet is not a multisig.');
    }

    // no param null is allowed
    const paramKeys = ['name', 'symbol', 'amount', 'address'];
    for (const key of paramKeys) {
      if (!params[key]) {
        throw new Error(`'${key} param can not be null or undefined.'`);
      }
    }

    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: params.name,
        symbol: params.symbol,
        amount: params.amount,
        address: params.address,
        change_address: params.address,
      })
      .set({ 'x-wallet-id': this.#walletId });
    return response.body.txHex;
  }

  /**
   * Sign the transaction proposal and send the signed transaction.
   *
   * @param params
   * @param {string} params.txHex Transaction proposal
   * @param {string} params.wallets Set of all wallets composing the multisig wallet
   * @param {number} params.xSignatures Number X of signatures to be generated for the transaction
   * @param {boolean} [params.dontLogErrors] Skip logging errors.
   * @returns {Promise<unknown>} Sent transaction
   *
   * XXX: only supports multisig
   */
  async signAndPush(params) {
    if (!this.#multisig) {
      throw new Error('The wallet is not a multisig.');
    }
    const {
      txHex = null,
      wallets = null,
      xSignatures = null,
    } = params;
    const _params = { txHex, wallets, xSignatures };

    // no param null is allowed
    for (const key of Object.keys(_params)) {
      if (!_params[key]) {
        throw new Error(`'${key} param can not be null.'`);
      }
    }

    // Creating the request body from mandatory and optional parameters
    const tokenCreationBody = {
      txHex: _params.txHex,
      signatures: await TestUtils.getXSignatures(
        _params.txHex,
        _params.wallets,
        _params.xSignatures
      ),
    };

    const newTokenResponse = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send(tokenCreationBody)
      .set({ 'x-wallet-id': this.#walletId });

    const transaction = await TestUtils.handleTransactionResponse({
      methodName: 'createToken',
      requestBody: tokenCreationBody,
      txResponse: newTokenResponse,
      dontLogErrors: params.dontLogErrors,
      walletIdsToWait: [this.#walletId],
    });

    TestUtils.log('Sign and push transaction', { transaction });
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

    const txTimeHelper = new TxTimeHelper('send-tx');
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send(sendOptions)
      .set(TestUtils.generateHeader(this.#walletId));
    txTimeHelper.informResponse(response.body.hash);

    const walletIdsToWait = [this.#walletId];
    if (options.destinationWallet) {
      walletIdsToWait.push(options.destinationWallet);
    }

    const transaction = await TestUtils.handleTransactionResponse({
      methodName: 'sendTx',
      requestBody: sendOptions,
      txResponse: response,
      dontLogErrors: options.dontLogErrors,
      walletIdsToWait,
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
