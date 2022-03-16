import TestUtils from './test-utils';

describe("tx-history api", () => {
  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/tx-history")
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(16);
  });

  it("should return limit (string or number) the transactions returned", async () => {
    let response = await TestUtils.request
      .get("/wallet/tx-history")
      .query({ limit: 3 })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    response = await TestUtils.request
      .get("/wallet/tx-history")
      .query({ limit: "3" })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });
});
