/* eslint-disable no-console */

import * as Path from 'path';

const fsold = require('fs');

const fs = fsold.promises;

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
  #instanceFilename;

  #fileFullPath;

  get filename() {
    return this.#instanceFilename;
  }

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
    const humanReadableTimestamp = date.toISOString()
      .replace(/-/g, '') // Remove date separator
      .replace(/:/g, '') // Remove hour separator
      .split('.')[0]; // Get only the seconds integer
    const additionalTitle = title ? `-${title}` : '';
    const filename = `${humanReadableTimestamp}${additionalTitle}-integrationTest.log`;
    this.#instanceFilename = filename;
  }

  /**
   * Initializes the log file on a specified folder
   * @param {string} rootFolder
   * @param {string} [testName] Optional title to include in the filename
   * @returns {Promise<void>}
   */
  async init(rootFolder, testName) {
    if (!rootFolder) throw new Error(`Root folder is mandatory`);

    // Create the temporary files directory, if it does not exist
    const tmpDir = Path.join(rootFolder, `/tmp/`);

    /*
     * The promisified version of fs.assign is incompatible with our babel-node setup
     * for some reason. Reverting back to using the old callback solution for compatibility.
     */
    const dirPromise = new Promise((resolve, reject) => {
      try {
        fsold.access(tmpDir, async (err, results) => {
          if (err) {
            fs.mkdir(tmpDir)
              .catch((err2) => {
                console.error(`Could not create the directory for the log files: ${err2.stack}`);
                reject(err2);
              });
          }
        });
      } catch (err) {
        console.error('Untreated error on fs.access: ', err.stack);
        reject(err);
      }
      resolve();
    });

    await dirPromise;
    this.#fileFullPath = Path.join(tmpDir, this.#instanceFilename);
    await this.insertLineToLog(`Log initialized`);
  }

  /**
   * Most common interaction: append a log message into the file
   * @param {string} input Log Message
   * @returns {Promise<void>}
   */
  async insertLineToLog(input) {
    const message = `\n[${new Date().toISOString()}] ${input}`;
    await fs.appendFile(this.#fileFullPath, message);
  }

  /**
   * Wrapper for adding a "New Wallet" message
   * @param {string} walletId
   * @param {string} walletWords
   * @returns {Promise<void>}
   */
  async informNewWallet(walletId, walletWords) {
    return this.insertLineToLog(`New wallet: ${walletId} , words: ${walletWords}`);
  }

  /**
   * Wrapper for adding a "Wallet Addresses" message
   * @param {string} walletId
   * @param {string} addresses
   * @returns {Promise<void>}
   */
  async informWalletAddresses(walletId, addresses) {
    const strAddresses = addresses
      .map((address, index) => `[${index}] ${address}`)
      .join(' , ');

    return this.insertLineToLog(`Some wallet addresses for ${walletId}: ${strAddresses}`);
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
    let origin = `${transactionObject.originWallet}`;
    if (transactionObject.originAddress) origin += `[${transactionObject.originAddress}]`;

    let destination = `${transactionObject.destinationWallet}`;
    if (transactionObject.destinationAddress) {
      destination += `[${transactionObject.destinationAddress}]`;
    }

    const title = `${transactionObject.title} - ` || '';

    const message = `Tx ${transactionObject.id} : ${title}${origin} `
      + `=> ${transactionObject.value} => ${destination}`;
    return this.insertLineToLog(message);
  }
}
