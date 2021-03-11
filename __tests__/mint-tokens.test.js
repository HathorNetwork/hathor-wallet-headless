import TestUtils from "./test-utils";

describe("mint-tokens api", () => {
  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .post("/wallet/mint-tokens")
      .send({
        token: "03",
        amount: 1,
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it("should create a token with amount as string", async () => {
    const response = await TestUtils.request
      .post("/wallet/mint-tokens")
      .send({
        token: "03",
        amount: "1",
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it("should not mint a token without the required parameters", async () => {
    ["token", "amount"].forEach(async (field) => {
      const token = {
        token: "03",
        amount: 1,
      };
      delete token[field];
      const response = await TestUtils.request
        .post("/wallet/mint-tokens")
        .send(token)
        .set({ "x-wallet-id": TestUtils.walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBeFalsy();
    });
  });

  it("should receive an error when trying to do concurrent mint-tokens (lock/unlock behavior)", async () => {
    const promise1 = TestUtils.request
      .post("/wallet/mint-tokens")
      .send({
        token: "03",
        amount: 1,
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    const promise2 = TestUtils.request
      .post("/wallet/mint-tokens")
      .send({
        token: "03",
        amount: 1,
      })
      .set({ "x-wallet-id": TestUtils.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);
    expect(response1.status).toBe(200);
    expect(response1.body.hash).toBeTruthy();
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();
  });
});
