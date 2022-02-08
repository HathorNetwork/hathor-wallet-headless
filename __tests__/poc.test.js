import {TestUtils, WALLET_CONSTANTS} from './test-utils-integration';
import testUtils from "./test-utils";

describe("balance api", () => {
  beforeAll(async () => {
    await TestUtils.startWallet(WALLET_CONSTANTS.genesis)
    await TestUtils.startWallet(WALLET_CONSTANTS.second)
  })

  afterAll(async () => {
    await TestUtils.stopWallet(WALLET_CONSTANTS.genesis.walletId)
    await TestUtils.stopWallet(WALLET_CONSTANTS.second.walletId)
  })

  it('should return the value of the genesis block', async done => {
    const balanceResult = await testUtils.request
      .get('/wallet/balance')
      .set({ "x-wallet-id": WALLET_CONSTANTS.genesis.walletId });

    expect(balanceResult.body.available === 100000000000)
    done()
  })

  it('should return the empty funds of the second wallet', async done => {
    const balanceResult = await testUtils.request
      .get('/wallet/balance')
      .set({ "x-wallet-id": WALLET_CONSTANTS.second.walletId });

    expect(balanceResult.body.available === 0)
    done()
  })

});
