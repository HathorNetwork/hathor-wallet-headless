import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('transaction routes', () => {
  let wallet1;

  beforeAll(async () => {
    try {
      // An empty wallet
      wallet1 = new WalletHelper('transaction-1');
      await wallet1.start();
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
});
