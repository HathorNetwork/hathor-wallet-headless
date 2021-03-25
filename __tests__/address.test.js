import { wallet as walletUtils } from "@hathor/wallet-lib";
import TestUtils from "./test-utils";

describe("address api", () => {
  it("should return 200 with a valid body", async () => {
    let response = await TestUtils.request
      .get("/wallet/address")
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[1]);

    // Should return the same address for a second call
    response = await TestUtils.request
      .get("/wallet/address")
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[1]);
  });

  it("should return 200 with a valid body for index = 0", async () => {
    const response = await TestUtils.request
      .get("/wallet/address")
      .query({ index: 0 })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[0]);
  });

  it("should return 200 for a custom index (number or string)", async () => {
    let response = await TestUtils.request
      .get("/wallet/address")
      .query({ index: 2 })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[2]);

    response = await TestUtils.request
      .get("/wallet/address")
      .query({ index: "2" })
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.body.address).toBe(TestUtils.addresses[2]);
  });

  it("should return a new address with mark_as_used until the gapLimit is reached", async () => {
    const gapLimit = walletUtils.getGapLimit();
    for (let index = 1; index <= gapLimit; index++) {
      const response = await TestUtils.request
        .get("/wallet/address")
        .query({ mark_as_used: true })
        .set({ "x-wallet-id": TestUtils.walletId });
      expect(response.status).toBe(200);
      expect(response.body.address).toBe(TestUtils.addresses[index]);
    }

    // Subsequent calls should return the last address as the gap limit was reached
    const response = await TestUtils.request
      .get("/wallet/address")
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe(TestUtils.addresses[gapLimit]);
  });
});
