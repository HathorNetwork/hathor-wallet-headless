import * as Path from "path";

const fsold = require('fs');
const fs = fsold.promises;

export const loggers = {
  /**
   * @type: TxLogger
   */
  test: null
}

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
   * Builds the log filename based on current time and an optional title
   * @param {string} [title] Optional title. Keep it short and simple for readability
   */
  constructor(title) {
    const date = new Date();
    const timestamp = date.toISOString()
      .replace(/-/g,'') // Remove date separator
      .replace(/:/g,'') // Remove hour separator
      .split('.')[0] // Get only the seconds integer
    const additionalTitle = `-${title}` || ''
    const filename = `${timestamp}${additionalTitle}-integrationTest.log`;
    this.#instanceFilename = filename;
  }

  /**
   * Initializes the log file on a specified folder
   * @param {string} rootFolder
   * @param {string} [testName] Optional title to include in the filename
   * @returns {Promise<void>}
   */
  async init(rootFolder, testName) {
    if (!rootFolder) throw new Error(`Root folder is mandatory`)

    // Create the temporary files directory, if it does not exist
    const tmpDir = Path.join(rootFolder, `/tmp/`);

    // The promisified version of fs.assign is incompatible with our babel-node setup for some reason.
    // Reverting back to using the old callback solution for compatibility
    const dirPromise = new Promise((resolve) => {
      try {
        fsold.access(tmpDir, async (err, results) => {
          if (err) {
            fs.mkdir(tmpDir)
              .catch(err2 => {
                console.error(`Now that's an error: ${err2.stack}`);
              });
          }
        })
      } catch (err) {
        console.error('Untreated error on fs.access: ', err.stack);
      }
      finally {
        resolve()
      }
    })

    await dirPromise
    console.log(`Initialized ${this.#instanceFilename}`)
    this.#fileFullPath = Path.join(tmpDir, this.#instanceFilename);
    await this.insertLineToLog(`Log initialized`)
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
    let strAddresses = addresses
      .map((address, index) => {
        return `[${index}] ${address}`;
      })
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
   * @param {string} [transactionObject.title] Some title to identify the transaction to a log reader
   */
  async informSimpleTransaction(transactionObject) {
    let origin = `${transactionObject.originWallet}`;
    if (transactionObject.originAddress) origin += `[${transactionObject.originAddress}]`;

    let destination = `${transactionObject.destinationWallet}`;
    if (transactionObject.destinationAddress) destination += `[${transactionObject.destinationAddress}]`;

    const title = `${transactionObject.title} - ` || ''

    const message = `Tx ${transactionObject.id} : ${title}${origin} => ${transactionObject.value} => ${destination}`;
    return this.insertLineToLog(message);
  }

}
