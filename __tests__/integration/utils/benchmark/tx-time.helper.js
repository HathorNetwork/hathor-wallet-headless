import { TxBenchmarkUtil } from './tx-benchmark.util';

/**
 * @extends TxInstance
 */
export class TxTimeHelper {
  constructor(type) {
    this.type = type;
    this.startTime = Date.now().valueOf();
  }

  informResponse(txId) {
    this.endTime = Date.now().valueOf();
    this.duration = this.endTime - this.startTime;
    this.txId = txId;
    TxBenchmarkUtil.addTx(this);
  }
}
