import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('tx-history routes', () => {
  /** @type WalletHelper */
  let wallet1;
  let wallet2;

  /**
   * A map of transactions, where the key is the tx_id
   * @example { "hash-10": transactionObject, "hash-20": transactionObject }
   * @type {Record<string,unknown>}
   */
  const fundTransactions = {};

  /**
   * A map of transactions, where the key is in the format "tx{value}"
   * @example { tx10: "hash-10", tx20: "hash-20" }
   * @type {Record<string,unknown>}
   */
  const fundHashes = {};

  beforeAll(async () => {
    try {
      // An empty wallet
      wallet1 = WalletHelper.getPrecalculatedWallet('txHistory1');
      // A wallet with 5 transactions containing 10, 20, 30, 40 and 50 HTR each
      wallet2 = WalletHelper.getPrecalculatedWallet('txHistory2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);

      for (let amount = 10; amount < 60; amount += 10) {
        const fundTx = await wallet2.injectFunds(amount, 1);
        fundTransactions[fundTx.hash] = fundTx;
        fundHashes[`tx${amount}`] = fundTx.hash;
      }
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should return an empty array of transactions for an empty wallet', async () => {
    const balanceResult = await TestUtils.request
      .get('/wallet/tx-history')
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(balanceResult.status).toBe(200);
    expect(balanceResult.body).toHaveLength(0);
  });

  it('should return transactions for a wallet', async () => {
    const balanceResult = await TestUtils.request
      .get('/wallet/tx-history')
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(balanceResult.status).toBe(200);
    const transactions = balanceResult.body;
    expect(transactions).toHaveLength(5);

    // Validating each transaction
    for (const txIndex in transactions) {
      const transaction = transactions[txIndex];
      const fundTx = fundTransactions[transaction.tx_id];

      // If the two first outputs and the first input are the same,
      // it will be enough to identify the transaction
      expect(fundTx).toBeTruthy();
      expect(transaction.inputs[0].tx_id).toEqual(fundTx.inputs[0].tx_id);
      expect(transaction.outputs[0].value).toEqual(fundTx.outputs[0].value);
      expect(transaction.outputs[1].value).toEqual(fundTx.outputs[1].value);
    }

    // Validating the transactions' order: chronological DESCENDING
    expect(transactions[4].tx_id).toEqual(fundHashes.tx10);
    expect(transactions[3].tx_id).toEqual(fundHashes.tx20);
    expect(transactions[2].tx_id).toEqual(fundHashes.tx30);
    expect(transactions[1].tx_id).toEqual(fundHashes.tx40);
    expect(transactions[0].tx_id).toEqual(fundHashes.tx50);
  });

  it('should return transactions for a wallet with query limit', async () => {
    const balanceResult = await TestUtils.request
      .get('/wallet/tx-history')
      .query({ limit: 3 })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(balanceResult.status).toBe(200);
    const transactions = balanceResult.body;
    expect(transactions).toHaveLength(3);

    // The transactions must be the latest ones, in DESCENDING chronological order
    expect(transactions[0].tx_id).toEqual(fundHashes.tx50);
    expect(transactions[1].tx_id).toEqual(fundHashes.tx40);
    expect(transactions[2].tx_id).toEqual(fundHashes.tx30);
  });
});
