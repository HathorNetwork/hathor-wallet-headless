/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
 * @typedef TxSummary
 * @property {number} sumTxDuration Sum of all the time awaiting for transactions to execute
 * @property {number} amountTxs Amount of transactions executed in this benchmark
 * @property {number} avgTxDuration Average time for executing a transaction in the benchmark
 */

/**
 * List of tx instances that were started
 * @type TxInstance[]
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

  /**
   * Calculates a summary of transaction length for all instances available locally.
   * @returns {TxSummary}
   */
  static calculateSummary() {
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

  /**
   * A method to write all the local storage instances into a log file via Winston.
   * @returns {Promise<void>}
   */
  static async logResults() {
    for (const txIndex in instances) {
      const metadata = { tx: instances[txIndex] };
      loggers.txBenchmark.insertLineToLog('Tx instance', metadata);
      await delay(0); // Necessary to allow each log request to be fulfilled
    }
  }
}
