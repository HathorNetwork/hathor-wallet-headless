import TestUtils from "./test-utils";

const WALLET_ID = "transaction wallet";

describe("transaction api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId: WALLET_ID });
  });

  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/transaction")
      .query({
        id: "000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce",
      })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.tx_id).toBe(
      "000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce"
    );
  });

  it("should not find an invalid transaction", async () => {
    const response = await TestUtils.request
      .get("/wallet/transaction")
      .query({
        id: "1",
      })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: WALLET_ID });
  });
});
