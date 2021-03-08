import TestUtils from "./test-utils";

const WALLET_ID = "tx-history wallet";

describe("tx-history api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId: WALLET_ID });
  });

  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/tx-history")
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(13);
  });

  it("should return limit (string or number) the transactions returned", async () => {
    let response = await TestUtils.request
      .get("/wallet/tx-history")
      .query({ limit: 3 })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    response = await TestUtils.request
      .get("/wallet/tx-history")
      .query({ limit: '3' })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: WALLET_ID });
  });
});
