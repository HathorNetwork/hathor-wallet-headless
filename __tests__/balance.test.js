import TestUtils from "./test-utils";

const WALLET_ID = "balance wallet";

describe("balance api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId: WALLET_ID });
  });

  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/balance")
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(76800);
    expect(response.body.locked).toBe(0);
  });

  it("should return balance for custom token", async () => {
    const response = await TestUtils.request
      .get("/wallet/balance")
      .query({ token: '09' })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(6400);
    expect(response.body.locked).toBe(0);
  });

  it("should return no balance for custom token with invalid type (number)", async () => {
    const response = await TestUtils.request
      .get("/wallet/balance")
      .query({ token: 9 })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(0);
    expect(response.body.locked).toBe(0);
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: WALLET_ID });
  });
});
