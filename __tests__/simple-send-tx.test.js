import TestUtils from "./test-utils";

describe("simple-send-tx api", () => {
  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .post("/wallet/simple-send-tx")
      .send({
        address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc",
        value: 1,
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
  });

  it("should accept value as string", async () => {
    const response = await TestUtils.request
      .post("/wallet/simple-send-tx")
      .send({
        address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc",
        value: '1',
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
  });
});
