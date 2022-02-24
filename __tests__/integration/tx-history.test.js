import {TestUtils, WalletHelper} from "./test-utils-integration";

describe('tx-history routes', () => {
  /** @type WalletHelper */
  let wallet1, wallet2;

  /**
   * A map of transactions, where the key is the tx_id
   * @type {Record<string,unknown>}
   */
  let fundTransactions = {};

  beforeAll(async () => {
    try {
      // An empty wallet
      wallet1 = new WalletHelper('txHistory1');
      await wallet1.start();

      // A wallet with 5 transactions containing 10, 20, 30, 40 and 50 HTR each
      wallet2 = new WalletHelper('txHistory2');
      await wallet2.start();
      for (let amount = 10; amount < 60; amount = amount + 10) {
        const fundTx = await wallet2.injectFunds(amount, 1);
        fundTransactions[fundTx.hash] = fundTx;
      }


    } catch (err) {
      console.error(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should return an empty array of transactions for an empty wallet', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/tx-history')
      .set({"x-wallet-id": wallet1.walletId});

    expect(balanceResult.status).toBe(200);
    expect(balanceResult.body).toHaveLength(0);
    done();
  });

  it('should return transactions for a wallet', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/tx-history')
      .set({"x-wallet-id": wallet2.walletId});

    expect(balanceResult.status).toBe(200);
    const transactions = balanceResult.body;
    expect(transactions).toHaveLength(5);
    for (const txIndex in transactions) {
      const transaction = transactions[txIndex];
      const fundTx = fundTransactions[transaction.tx_id];

      // If the two first outputs and the first input are the same, it will be enough evidence for this test
      expect(fundTx).toBeTruthy();
      expect(transaction.inputs[0].tx_id).toEqual(fundTx.inputs[0].tx_id);
      expect(transaction.outputs[0].value).toEqual(fundTx.outputs[0].value);
      expect(transaction.outputs[1].value).toEqual(fundTx.outputs[1].value);
    }
    done();
  });

  it('should return transactions for a wallet with query limit', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/tx-history')
      .query({limit: 3})
      .set({"x-wallet-id": wallet2.walletId});

    expect(balanceResult.status).toBe(200);
    const transactions = balanceResult.body;
    expect(transactions).toHaveLength(3);
    for (const txIndex in transactions) {
      const transaction = transactions[txIndex];
      const fundTx = fundTransactions[transaction.tx_id];

      // If we found the transaction it is evidence enough that it worked, since it is a hash of every other data there.
      expect(fundTx).toBeTruthy();
    }
    done();
  });

});
