import TestUtils from "./test-utils";

describe.only("send-tx api", () => {
  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 }],
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it("should accept value as string", async () => {
    const response = await TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [
          { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 },
          { address: "WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN", value: "1" },
        ],
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it("should not accept transactions without address or value", async () => {
    let response = await TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc" }],
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.succes).toBeFalsy();

    response = await TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ value: 1 }],
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.succes).toBeFalsy();
  });

  it("should receive an error when trying to do concurrent transactions (lock/unlock behavior)", async () => {
    const promise1 = TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 }],
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    const promise2 = TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 }],
      })
      .set({ "x-wallet-id": TestUtils.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);
    expect(response1.status).toBe(200);
    expect(response1.body.hash).toBeTruthy();
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();
  });

  it("should accept a custom token transaction", async () => {
    const response = await TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 }],
        token: {
          name: "stub_token",
          uid: "01",
          symbol: "stub_token",
        },
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
  });

  it("should not accept a custom token transaction without funds to cover it", async () => {
    const response = await TestUtils.request
      .post("/wallet/send-tx")
      .send({
        outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 }],
        token: {
          name: "stub_token_2",
          uid: "02",
          symbol: "stub_token_2",
        },
      })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should not accept a custom token transaction without all token properties", async () => {
    ['name', 'uid', 'symbol'].forEach(async (field) => {
      const token = {
        name: "stub_token",
        uid: "01",
        symbol: "stub_token",
      };
      delete token[field];
      const response = await TestUtils.request
        .post("/wallet/send-tx")
        .send({
          outputs: [{ address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 }],
          token: token,
        })
        .set({ "x-wallet-id": TestUtils.walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBeFalsy();
    });
  });
});
