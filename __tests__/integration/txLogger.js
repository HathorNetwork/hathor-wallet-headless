/* eslint-disable no-console */

import winston from 'winston';
import config from '../../src/config';

export const loggers = {
  /**
   * @type: TxLogger
   */
  test: null
};

/**
 * A logger for every transaction on the integration tests for debugging.
 */
export class TxLogger {
  /**
   * @type: string
   * Stores the log filename, which is built on the constructor.
   */
  #instanceFilename;

  /**
   * Winston logger instance
   * @type {winston}
   */
  #logger;

  /**
   * Builds the log filename based on current time and an optional title.
   * The resulting filename will be in the format:
   * <pre><code>
   * 20220224T084737-title-integrationTest.log
   * </pre></code>
   * @param {string} [title] Optional title. Keep it short and simple for readability
   */
  constructor(title) {
    const date = new Date();

    /**
     * Timestamp in a format like "20220224T084737" for easy human reading on a filename
     * @type {string}
     */
    const humanReadableTimestamp = date.toISOString()
      .replace(/-/g, '') // Remove date separator
      .replace(/:/g, '') // Remove hour separator
      .split('.')[0]; // Get only the seconds integer

    const additionalTitle = title ? `-${title}` : '';
    const filename = `${humanReadableTimestamp}${additionalTitle}-integrationTest.log`;
    this.#instanceFilename = filename;
  }

  get filename() {
    return this.#instanceFilename;
  }

  /**
   * Initializes the helper with a winston logger instance
   * @returns {void}
   */
  init() {
    this.#logger = winston.createLogger({
      defaultMeta: { service: 'txLogger' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
          ),
          level: config.consoleLevel || 'silly',
        }),
        new winston.transports.File({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.prettyPrint()
          ),
          filename: `${config.integrationTestLog.outputFolder}${this.#instanceFilename}`,
          level: config.consoleLevel || 'silly',
          colorize: false,
        })
      ]
    });

    this.#logger.info('Log initialized');
  }

  /**
   * Most common interaction: append a log message into the file
   *
   * @param {string} input Log Message
   * @param {Record<string,unknown>} [metadata] Additional data for winston logs
   * @returns {void}
   */
  insertLineToLog(input, metadata) {
    this.#logger.info(input, metadata);
  }

  /**
   * Wrapper for adding a "New Wallet" message
   * @param {string} walletId
   * @param {string} walletWords
   * @returns {void}
   */
  informNewWallet(walletId, walletWords) {
    this.#logger.info('New wallet created', { walletId, walletWords });
  }

  /**
   * Wrapper for adding a "Wallet Addresses" message
   * @param {string} walletId
   * @param {string[]} addresses
   * @returns {void}
   */
  informWalletAddresses(walletId, addresses) {
    this.#logger.info('Sample of wallet addresses.', { walletId, addresses });
  }

  /**
   * Wrapper for adding a "New Transaction" message
   * @param transactionObject
   * @param {string} transactionObject.id Transaction identification for debugging on the explorer
   * @param {string} transactionObject.originWallet
   * @param {string} [transactionObject.destinationWallet]
   * @param {number} transactionObject.value
   * @param {string} [transactionObject.originAddress]
   * @param {string} transactionObject.destinationAddress
   * @param {string} [transactionObject.title] Some title to identify the transaction to log readers
   */
  async informSimpleTransaction(transactionObject) {
    this.#logger.info('New transaction', transactionObject);
  }
}
