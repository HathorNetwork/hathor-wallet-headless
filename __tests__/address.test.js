import TestUtils from "./test-utils";

const WALLET_ID = "address wallet";

describe("address api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId: WALLET_ID });
  });

  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/address")
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe("WmtWgtk5GxdcDKwjNwmXXn74nQWTPWhKfx");
  });

  it("should return 200 for a custom index (number or string)", async () => {
    let response = await TestUtils.request
      .get("/wallet/address")
      .query({ index: 2 })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe("WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc");

    response = await TestUtils.request
      .get("/wallet/address")
      .query({ index: '2' })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.body.address).toBe("WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc");
  });

  it("should return a new address with mark_as_used", async () => {
    let response = await TestUtils.request
      .get("/wallet/address")
      .query({ mark_as_used: true })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);

    response = await TestUtils.request
      .get("/wallet/address")
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.body.address).toBe("WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc");
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: WALLET_ID });
  });
});
