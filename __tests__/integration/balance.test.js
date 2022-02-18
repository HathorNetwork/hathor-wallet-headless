import {getRandomInt, TestUtils, WalletHelper} from "./test-utils-integration";

describe('balance routes', () => {
  /** @type WalletHelper */
  let wallet1, wallet2, wallet3;
  const wallet2Balance = getRandomInt(200);

  beforeAll(async () => {
    try {
      wallet1 = new WalletHelper('balance1');
      await wallet1.start();

      wallet2 = new WalletHelper('balance2');
      await wallet2.start();
      await wallet2.injectFunds(wallet2Balance)

      wallet3 = new WalletHelper('custom3')
      await wallet3.start();
      await wallet3.injectFunds(100);
    } catch (err) {
      console.error(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should return zero for an empty wallet', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({"x-wallet-id": wallet1.walletId});

    expect(balanceResult.body.available).toBe(0);
    expect(balanceResult.body.locked).toBe(0);
    done();
  });

  it('should return correct balance for a wallet with one transaction', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({"x-wallet-id": wallet2.walletId});

    expect(balanceResult.body.available).toBe(wallet2Balance);
    expect(balanceResult.body.locked).toBe(0);
    done();
  });

  it('should return correct balance for a custom token (empty)', async done => {
    const balanceResult = await TestUtils.request
      .get("/wallet/balance")
      .query({ token: 'TST' })
      .set({ "x-wallet-id": wallet1.walletId });

    expect(balanceResult.body.available).toBe(0);
    expect(balanceResult.body.locked).toBe(0);
    done();
  })

  it('should return correct balance for a custom token', async done => {
    const tokenAmount = getRandomInt(200, 100)
    const newTokenResponse = await TestUtils.request
      .post("/wallet/create-token")
      .send({
        name: "Test Token",
        symbol: "TST",
        amount: tokenAmount
      })
      .set({ "x-wallet-id": wallet3.walletId })

    const tokenHash = newTokenResponse.body.hash
    TestUtils.logTx(`Created ${tokenAmount} tokens TST on ${wallet3.walletId} - Hash ${tokenHash}`)
    await TestUtils.delay(1000)

    const balanceResult = await TestUtils.request
      .get("/wallet/balance")
      .query({ token: tokenHash })
      .set({ "x-wallet-id": wallet3.walletId });

    expect(balanceResult.body.available).toBe(tokenAmount);
    expect(balanceResult.body.locked).toBe(0);
    done();
  })

  it.skip('should return a treated error for a connection failure with the fullnode', async done => {
    expect(false).toBe('Not Implemented')
    done();
  })

});
