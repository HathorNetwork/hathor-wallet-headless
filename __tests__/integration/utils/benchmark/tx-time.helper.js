import { TxBenchmarkUtil } from './tx-benchmark.util';

/**
 * A helper to keep track of how long a transaction takes to be executed,
 * from the Wallet Headless perspective.
 * @extends TxInstance
 * @example
 * const txTimeHelper = new TxTimeHelper('simple-send-tx');
 * const response = await TestUtils.request
 *   .post('/wallet/simple-send-tx')
 *   .send(requestBody)
 *   .set(TestUtils.generateHeader('wallet-1'));
 * txTimeHelper.informResponse(response.body.hash);
 */
export class TxTimeHelper {
  /**
   * The instance should be called right before the transaction request
   * @param {string} type
   */
  constructor(type) {
    this.type = type;
    this.startTime = Date.now().valueOf();
  }

  /**
   * Method to be called as soon as the transaction completes.
   * @param {string} txId Transaction id to better identify it on the logs
   */
  informResponse(txId) {
    this.endTime = Date.now().valueOf();
    this.duration = this.endTime - this.startTime;
    this.txId = txId;
    TxBenchmarkUtil.addTx(this);
  }
}
