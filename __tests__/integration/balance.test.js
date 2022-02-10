import {getRandomInt, TestUtils, WalletHelper} from "./test-utils-integration";

describe('balance routes', () => {
  /** @type WalletHelper */
  let wallet1, wallet2;
  const wallet2Balance = getRandomInt(200);

  beforeAll(async () => {
    try {
      wallet1 = new WalletHelper('balance1');
      await wallet1.start();

      wallet2 = new WalletHelper('balance2');
      await wallet2.start();
      await TestUtils.injectFundsIntoAddress(await wallet2.getAddressAt(0), wallet2Balance);
      await TestUtils.delay(1000);
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
    done();
  });

  it('should return correct balance for a wallet with one transaction', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({"x-wallet-id": wallet2.walletId});

    expect(balanceResult.body.available).toBe(wallet2Balance);
    done();
  });
});
