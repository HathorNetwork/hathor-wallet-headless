import TestUtils from "./test-utils";

const WALLET_ID = "utxo wallet";

describe("utxo api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId: WALLET_ID });
  });

  it("utxo-filter should return 200 with a valid body", async () => {
    const response = await TestUtils.request
      .get("/wallet/utxo-filter")
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.utxos).toHaveLength(12);
    expect(response.body.total_amount_available).toBe(76800);
    expect(response.body.total_amount_locked).toBe(0);
  });

  it("utxo-consolidation should consolidate all utxos", async () => {
    const response = await TestUtils.request
      .post("/wallet/utxo-consolidation")
      .send({
        destination_address: "WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN",
      })
      .set({ "x-wallet-id": WALLET_ID });
    expect(response.status).toBe(200);
    expect(response.body.total_utxos_consolidated).toBe(12);
    expect(response.body.total_amount).toBe(76800);
    expect(response.body.utxos).toHaveLength(12);
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: WALLET_ID });
  });
});
