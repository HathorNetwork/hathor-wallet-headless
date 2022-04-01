import TestUtils from "./test-utils";

describe.only("multisig-pubkey api", () => {
  beforeAll(() => {
    return TestUtils.stopWallet();
  });

  it("should not return the xpubkey without seedKey", async () => {
    const response = await TestUtils.request
      .post("/multisig-pubkey")
      .send({});
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should not return the xpubkey with an invalid seedKey", async () => {
    const response = await TestUtils.request
      .post("/multisig-pubkey")
      .send({ seedKey: "123" });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should return the pubkey of a configured seed", async () => {
    const response = await TestUtils.request
      .post("/multisig-pubkey")
      .send({ seedKey: TestUtils.seedKey });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.xpubkey).toBe(TestUtils.multisigXpub);
  });
});
