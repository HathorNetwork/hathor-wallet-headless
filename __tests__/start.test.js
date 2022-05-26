import TestUtils from './test-utils';
import { WALLET_CONSTANTS } from './integration/configuration/test-constants';

/*
 * Developer note:
 * Every test to '/start' must be done with the 'wallet-id': TestUtils.walletId
 * Calls to other ids will result in the mocked websocket calls not being activated and
 * leaked connections at the end of the test.
 */

const walletId = 'stub_wallet_start';

describe('start api', () => {
  beforeEach(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should not start a wallet with an invalid seedKey', async () => {
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: '123', 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should not start a wallet without a seedKey', async () => {
    const response = await TestUtils.request
      .post('/start')
      .send({ 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should not start a wallet without a wallet-id', async () => {
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should accept pre-calculated addresses', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      preCalculatedAddresses: ['addr1', 'addr2'],
    };

    const response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    /*
     * In the future this test must be expanded to check if the preCalculatedAddresses parameter
     * was passed to the wallet lib. This could be done either by mocking the HathorWallet class
     * or by returning a precalculation flag from the start method.
     */
    expect(response.body).toHaveProperty('success', true);
  });

  it('should require x-first-address if confirmFirstAddress is true', async () => {
    global.config.confirmFirstAddress = true;

    let response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();

    response = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.available).toBeUndefined();

    response = await TestUtils.request
      .get('/wallet/balance')
      .set({ 'x-wallet-id': walletId, 'x-first-address': TestUtils.addresses[0] });
    expect(response.status).toBe(200);
    expect(response.body.available).toBeDefined();

    global.config.confirmFirstAddress = null;
  });

  it('should start a MultiSig wallet if multisig is true', async () => {
    global.config.multisig = TestUtils.multisigData;
    await TestUtils.stopWallet({ walletId });

    const response1 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response1.status).toBe(200);
    expect(response1.body.success).toBeTruthy();

    const response2 = await TestUtils.request
      .get('/wallet/address')
      .query({ index: 0 })
      .set({ 'x-wallet-id': walletId });
    console.log(JSON.stringify(response2.body));
    expect(response2.status).toBe(200);
    expect(response2.body.address).toBe(TestUtils.multisigAddresses[0]);

    global.config.multisig = {};
  });

  it('should not start a incorrectly configured MultiSig if multisig is true', async () => {
    global.config.multisig = {};

    const response1 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response1.status).toBe(200);
    expect(response1.body.success).toBeFalsy();

    global.config.multisig = TestUtils.multisigData;
    global.config.multisig[TestUtils.seedKey].total = 6;

    const response2 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();

    global.config.multisig[TestUtils.seedKey].total = 5;
    global.config.multisig[TestUtils.seedKey].minSignatures = 6;

    const response3 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response3.status).toBe(200);
    expect(response3.body.success).toBeFalsy();

    global.config.multisig = {};
  });
});
