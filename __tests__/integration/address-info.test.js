import {getRandomInt, HATHOR_TOKEN_ID, TestUtils, WalletHelper} from "./test-utils-integration";

describe("address-info routes", () => {
  let wallet1, wallet2
  const address1balance = getRandomInt(200, 100)
  let customTokenHash

  beforeAll(async () => {
    try {
      // A random HTR value for the first wallet
      wallet1 = new WalletHelper('addinfo-1')
      await wallet1.start()
      await wallet1.injectFunds(address1balance, 1)

      // A fixed custom token amount for the second wallet
      wallet2 = new WalletHelper('addinfo-2')
      await wallet2.start()
      await wallet2.injectFunds(10)
      const customToken = await wallet2.createToken({
        amount: 500,
        name: 'AddInfo Token',
        symbol: "AIT",
        address: await wallet2.getAddressAt(1),
        change_address: await wallet2.getAddressAt(0)
      })
      customTokenHash = customToken.hash

      /*
       * The state here should be:
       * wallet1[1] with some value between 100 and 200
       * wallet2[0] with 0.05 HTR
       * wallet2[1] with 500 AIT
       */
    } catch (err) {
      console.error(err.stack)
    }
  })

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  })

  it("should return results for an address (empty)", async done => {
    const response = await TestUtils.request
      .get("/wallet/address-info")
      .query({address: await wallet1.getAddressAt(0)})
      .set({"x-wallet-id": wallet1.walletId});

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID)
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(0)
    expect(results.total_amount_sent).toBe(0)
    expect(results.total_amount_available).toBe(0)
    expect(results.total_amount_locked).toBe(0)
    done();
  });

  it("should return results for an address with a single receiving transaction", async done => {
    const response = await TestUtils.request
      .get("/wallet/address-info")
      .query({address: await wallet1.getAddressAt(1)})
      .set({"x-wallet-id": wallet1.walletId});

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID)
    expect(results.index).toBe(1);
    expect(results.total_amount_received).toBe(address1balance)
    expect(results.total_amount_sent).toBe(0)
    expect(results.total_amount_available).toBe(address1balance)
    expect(results.total_amount_locked).toBe(0)
    done();
  });

  it("should return results for an address with send/receive transactions", async done => {
    const response = await TestUtils.request
      .get("/wallet/address-info")
      .query({address: await wallet2.getAddressAt(0)})
      .set({"x-wallet-id": wallet2.walletId});

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(HATHOR_TOKEN_ID)
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(15) // 10 from genesis, 5 from token creation change
    expect(results.total_amount_sent).toBe(10) // token creation tx
    expect(results.total_amount_available).toBe(5) // change
    expect(results.total_amount_locked).toBe(0)
    done();
  });

  it("should return results for custom token for an address (empty)", async done => {
    const response = await TestUtils.request
      .get("/wallet/address-info")
      .query({
        address: await wallet2.getAddressAt(0),
        token: customTokenHash,
      })
      .set({"x-wallet-id": wallet2.walletId});

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(customTokenHash);
    expect(results.index).toBe(0);
    expect(results.total_amount_received).toBe(0)
    expect(results.total_amount_sent).toBe(0)
    expect(results.total_amount_available).toBe(0)
    expect(results.total_amount_locked).toBe(0)
    done();
  });

  it("should return results for custom token on an address with a single transaction", async done => {
    const response = await TestUtils.request
      .get("/wallet/address-info")
      .query({
        address: await wallet2.getAddressAt(1),
        token: customTokenHash,
      })
      .set({"x-wallet-id": wallet2.walletId});

    expect(response.status).toBe(200);

    const results = response.body;
    expect(results.success).toBeTruthy();
    expect(results.token).toBe(customTokenHash)
    expect(results.index).toBe(1);
    expect(results.total_amount_received).toBe(500)
    expect(results.total_amount_sent).toBe(0)
    expect(results.total_amount_available).toBe(500)
    expect(results.total_amount_locked).toBe(0)
    done();
  });

});
