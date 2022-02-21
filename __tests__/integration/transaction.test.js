import {TestUtils, WalletHelper} from "./test-utils-integration";

describe("transaction routes", () => {
  let wallet1;

  beforeAll(async () => {
    try {
      // A random HTR value for the first wallet
      wallet1 = new WalletHelper('transaction-1');
      await wallet1.start();
    } catch (err) {
      console.error(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  it('should return an error for an invalid transaction', async done => {
    const response = await TestUtils.request
      .get("/wallet/transaction")
      .query({
        id: "000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce"
      })
      .set({"x-wallet-id": wallet1.walletId});

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', false);
    done();
  });

  it('should return success for a valid transaction', async done => {
    const tx = await wallet1.injectFunds(1);

    const response = await TestUtils.request
      .get("/wallet/transaction")
      .query({
        id: tx.hash
      })
      .set({"x-wallet-id": wallet1.walletId});

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('is_voided', false);
    expect(response.body).toHaveProperty('tx_id', tx.hash);
    expect(response.body).toHaveProperty('version', tx.version);
    done();
  });
});
