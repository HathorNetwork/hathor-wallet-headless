import {TestUtils, WALLET_CONSTANTS} from './test-utils-integration';

const GENESIS_BLOCK_BALANCE = 100000000000;

describe.skip("proof of concept tests", () => {
  beforeAll(async () => {
    await TestUtils.startWallet(WALLET_CONSTANTS.second);
  })

  afterAll(async () => {
    await TestUtils.stopWallet(WALLET_CONSTANTS.second.walletId);
  })

  it('should return the value of the genesis block', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({ "x-wallet-id": WALLET_CONSTANTS.genesis.walletId });

    // If there is a running miner, the genesis wallet balance may be greater than the starting amount
    expect(balanceResult.body.available).toBeGreaterThanOrEqual(GENESIS_BLOCK_BALANCE)
    done()
  })

  it('should return the empty funds of the second wallet', async done => {
    const balanceResult = await TestUtils.request
      .get('/wallet/balance')
      .set({ "x-wallet-id": WALLET_CONSTANTS.second.walletId });

    expect(balanceResult.body.available).toBe(0)
    done()
  })

  it('should make a transaction from genesis address to second wallet', async done => {
    // Transfer 1.01 HTR to the second wallet
    const transactionAmount = 101;
    const transfer = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: WALLET_CONSTANTS.second.addresses[0],
        value: transactionAmount
      })
      .set({ "x-wallet-id": WALLET_CONSTANTS.genesis.walletId });

    await TestUtils.delay(1000)

    // Since the Genesis wallet is also the one that receives the block rewards,
    // its balance is constantly changing. So, we will check only the balance
    // on the second wallet
    const secondWallet = await TestUtils.request
      .get('/wallet/balance')
      .set({ "x-wallet-id": WALLET_CONSTANTS.second.walletId });
    expect(secondWallet.body.available).toBe(transactionAmount)

    done()
  })

});
