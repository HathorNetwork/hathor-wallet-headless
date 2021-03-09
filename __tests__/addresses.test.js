import TestUtils from "./test-utils";

describe("addresses api", () => {
  it("should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/addresses")
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.addresses).toHaveLength(2);
  });
});
