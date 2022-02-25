import { loggers } from '../txLogger';
import { TestUtils } from './test-utils-integration';

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
   * Starts this wallet and returns a formatted object with relevant wallet data
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
      loggers.test.informWalletAddresses(this.#walletId, this.#addresses)
        .catch(e => TestUtils.logError(e.stack));
    }

    return {
      walletId: this.#walletId,
      words: this.#words,
      addresses: this.#addresses
    };
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
   * Retrieves funds from the Genesis wallet and injects into this wallet at a specified address.
   * @param {number} value Value to be transferred
   * @param {number} [addressIndex=0] Address index. Defaults to 0
   * @param {FundInjectionOptions} [options]
   * @returns {Promise<{success}|*>}
   */
  async injectFunds(value, addressIndex = 0, options = {}) {
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
    let destination = '';
    if (tokenCreationBody.address) {
      destination += ` - destination: ${tokenCreationBody.address}`;
    }
    if (tokenCreationBody.change_address) {
      destination += ` - change: ${tokenCreationBody.change_address}`;
    }
    TestUtils.logTx(`Created ${amount} tokens ${symbol} on ${this.#walletId} `
      + `- Hash ${tokenHash}${destination}`);

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
}
