import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('transaction routes', () => {
  let wallet1;

  beforeAll(async () => {
    try {
      // An empty wallet
      wallet1 = WalletHelper.getPrecalculatedWallet('transaction-1');
      await WalletHelper.startMultipleWalletsForTest([wallet1]);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  it('should return an error for an invalid transaction', async done => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce'
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', false);
    done();
  });

  it('should return success for a valid transaction', async done => {
    // Generates a transaction
    const tx = await wallet1.injectFunds(1);
    const txId = tx.hash;

    // Queries for this transaction
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: txId
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('is_voided', false);
    expect(response.body).toHaveProperty('tx_id', txId);
    expect(response.body).toHaveProperty('version', tx.version);
    done();
  });

  it('test confirmation blocks', async done => {
    // Generates a transaction
    const tx = await wallet1.injectFunds(1);
    const txId = tx.hash;

    // Queries for this transaction
    const response = await TestUtils.request
      .get('/wallet/tx-confirmation-blocks')
      .query({
        id: txId
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);

    // We might have some blocks while we are getting these requests
    // so it's not easy to do an assert here
    const height = await TestUtils.getFullNodeNetworkHeight();
    const txData1 = await TestUtils.getFullNodeTransactionData(txId);

    let firstBlockHeight = txData1.meta.first_block_height;
    if (firstBlockHeight === null) {
      await TestUtils.waitNewBlock(height);
      const txData2 = await TestUtils.getFullNodeTransactionData(txId);
      firstBlockHeight = txData2.meta.first_block_height;
      expect(firstBlockHeight).not.toBeNull();
    }

    await TestUtils.waitNewBlock(firstBlockHeight);

    const response2 = await TestUtils.request
      .get('/wallet/tx-confirmation-blocks')
      .query({
        id: txId
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    const newHeight = await TestUtils.getFullNodeNetworkHeight();
    // With the async requests, new blocks may be mined, so we can't assert the equal
    // We will have at least the first block confirming plus one (with the await above)
    expect(response2.body.confirmationNumber).toBeGreaterThan(0);
    expect(response2.body.confirmationNumber).toBeLessThanOrEqual(newHeight - firstBlockHeight);

    done();
  });
});
