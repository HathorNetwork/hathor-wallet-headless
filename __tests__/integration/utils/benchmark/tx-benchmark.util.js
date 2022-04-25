import { loggers } from '../logger.util';
import { delay } from '../core.util';

/**
 * @typedef TxInstance
 * @property {string} type
 * @property {string} [txId]
 * @property {number} [startTime]
 * @property {number} [endTime]
 * @property {number} [duration]
 */

/**
 * List of wallet instances that were started
 * @type WalletInstanceBenchmark>[]
 */
const instances = [];

export class TxBenchmarkUtil {
  /**
   * Adds a transaction instance to the local storage
   * @param {TxInstance} txData
   */
  static addTx(txData) {
    instances.push({ ...txData });
  }

  static calculateSummary(walletIds) {
    const summary = {};
    let sumTxDuration = 0;

    for (const tx of instances) {
      sumTxDuration += tx.duration;
    }
    summary.sumTxDuration = sumTxDuration;
    summary.amountTxs = (instances.length + 1);
    summary.avgTxDuration = sumTxDuration / summary.amountTxs;

    return summary;
  }

  static async logResults() {
    for (const txIndex in instances) {
      const metadata = { tx: instances[txIndex] };
      loggers.txBenchmark.insertLineToLog('Wallet instance', metadata);
      await delay(0); // Necessary to allow each log request to be fulfilled
    }
  }
}
