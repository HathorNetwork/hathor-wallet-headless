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

  it("should start a MultiSig wallet if multisig is true", async () => {
    global.config.multisig = TestUtils.multisigData;
    TestUtils.stopWallet()

    let response1 = await TestUtils.request
      .post("/start")
      .send({ seedKey: TestUtils.seedKey, "wallet-id": TestUtils.walletId, "multisig": true });
    expect(response1.status).toBe(200);
    expect(response1.body.success).toBeTruthy();

    let response2 = await TestUtils.request
      .get("/wallet/address")
      .query({ index: 0 })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response2.status).toBe(200);
    expect(response2.body.address).toBe(TestUtils.multisigAddresses[0]);

    global.config.multisig = {};
  });

  it("should not start a incorrectly configured MultiSig if multisig is true", async () => {
    global.config.multisig = {};

    let response1 = await TestUtils.request
      .post("/start")
      .send({ seedKey: TestUtils.seedKey, "wallet-id": TestUtils.walletId, "multisig": true });
    expect(response1.status).toBe(200);
    expect(response1.body.success).toBeFalsy();

    global.config.multisig = TestUtils.multisigData;
    global.config.multisig[TestUtils.seedKey].total = 6;

    let response2 = await TestUtils.request
      .post("/start")
      .send({ seedKey: TestUtils.seedKey, "wallet-id": TestUtils.walletId, "multisig": true });
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();

    global.config.multisig[TestUtils.seedKey].total = 5;
    global.config.multisig[TestUtils.seedKey].minSignatures = 6;

    let response3 = await TestUtils.request
      .post("/start")
      .send({ seedKey: TestUtils.seedKey, "wallet-id": TestUtils.walletId, "multisig": true });
    expect(response3.status).toBe(200);
    expect(response3.body.success).toBeFalsy();

    global.config.multisig = {};
  });
});
