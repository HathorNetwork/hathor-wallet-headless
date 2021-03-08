import TestUtils from "./test-utils";

const WALLET_ID = "status wallet";

describe("status api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId: WALLET_ID });
  });

  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/status")
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.statusMessage).toBe('Ready');
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: WALLET_ID });
  });
});
