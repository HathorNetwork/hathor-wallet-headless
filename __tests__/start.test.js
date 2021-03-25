import TestUtils from "./test-utils";

describe.only("start api", () => {
  beforeAll(() => {
    return TestUtils.stopWallet();
  });

  it("should not start a wallet with an invalid seedKey", async () => {
    const response = await TestUtils.request
      .post("/start")
      .send({ seedKey: "123", "wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should not start a wallet without a seedKey", async () => {
    const response = await TestUtils.request
      .post("/start")
      .send({ "wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should not start a wallet without a wallet-id", async () => {
    const response = await TestUtils.request
      .post("/start")
      .send({ seedKey: TestUtils.seedKey });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should require x-first-address if confirmFirstAddress is true", async () => {
    global.config.confirmFirstAddress = true;

    let response = await TestUtils.request
      .post("/start")
      .send({ seedKey: TestUtils.seedKey, "wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();

    response = await TestUtils.request
      .get("/wallet/balance")
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.available).toBeUndefined();

    response = await TestUtils.request
      .get("/wallet/balance")
      .set({ "x-wallet-id": TestUtils.walletId, 'x-first-address': TestUtils.addresses[0] });
    expect(response.status).toBe(200);
    expect(response.body.available).toBeDefined();

    global.config.confirmFirstAddress = null;
  });
});
