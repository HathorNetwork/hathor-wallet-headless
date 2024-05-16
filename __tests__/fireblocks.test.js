import TestUtils from './test-utils';
import settings from '../src/settings';

const jwt = require('jsonwebtoken');

const walletId = 'stub_fireblocks';
const stubXpub = 'xpub6C95ufyyhEr2ntyGGfeHjyvxffmNZQ7WugyChhu1Fzor1tMUc4K2MUdwkcJoTzjVkg46hurWWU9gvZoivLiDk6MdsKukz3JiX5Fib2BDa2T';

jest.spyOn(jwt, 'sign').mockImplementation(() => 'stub_jwt_token');

describe('start fireblocks api', () => {
  afterEach(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should not start a wallet without a wallet-id', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ xpub: stubXpub });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(`wallet-id' is required`);
  });

  it('should not start a wallet without an xpub', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should not start a wallet with improper fireblocks config', async () => {
    const config = settings._getDefaultConfig();
    config.fireblocksApiKey = undefined;
    settings._setConfig(config);

    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, xpub: stubXpub });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);

    settings._resetConfig();
  });

  it('should not start a wallet with invalid xpub', async () => {
    const wrongXpub = 'xpub661MyMwAqRbcGkgsdLH1nacxkgSjZSaVdXJde5hVQASM1ajJtcHo43Fy1jz62oJcTRVPT6TMDtBr5vqfVEgQRBebS76APyiChEZmC63hu2c';
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, xpub: wrongXpub });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should start a wallet successfully', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({
        'wallet-id': walletId,
        xpub: stubXpub,
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    await TestUtils.waitReady({ walletId });
  });

  it('should not start two wallets with the same wallet-id', async () => {
    let response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, xpub: stubXpub });
    expect(response.status).toBe(200);
    console.log(JSON.stringify(response.body, null, 2));
    expect(response.body.success).toBe(true);

    response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, xpub: stubXpub });
    expect(response.status).toBe(200);
    console.log(JSON.stringify(response.body, null, 2));
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toEqual('WALLET_ALREADY_STARTED');

    // Ensure the wallet is ready before finishing the test and requesting it to be stopped
    await TestUtils.waitReady({ walletId });
  });

  it('should send', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, xpub: stubXpub });
    expect(response.status).toBe(200);
    console.log(JSON.stringify(response.body, null, 2));
    expect(response.body.success).toBe(true);

    await TestUtils.waitReady({ walletId });
    const response2 = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
        value: 1,
      })
      .set({ 'x-wallet-id': walletId });

    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(true);
  });
});
