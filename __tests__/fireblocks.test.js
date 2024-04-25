import TestUtils from './test-utils';
import { lock, lockTypes } from '../src/lock';
import * as constants from '../src/helpers/constants';
import settingsFixture from './__fixtures__/settings-fixture';

const jwt = require('jsonwebtoken');

// const walletsService = require('../src/services/wallets.service');

const walletId = 'stub_fireblocks';

jest.spyOn(jwt, 'sign').mockImplementation(() => 'stub_jwt_token');

describe('start fireblocks api', () => {
  afterEach(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should not start a wallet without a wallet-id', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'xpub-id': 'stub' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(`wallet-id' is required`);
  });

  it('should not start a wallet without an xpub-id', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should start a wallet successfully', async () => {
    const response = await TestUtils.request
      .post('/fireblocks/start')
      .send({
        'wallet-id': walletId,
        'xpub-id': 'stub'
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    await TestUtils.waitReady({ walletId });
  });

  it('should not start two wallets with the same wallet-id', async () => {
    let response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, 'xpub-id': 'stub' });
    expect(response.status).toBe(200);
    console.log(JSON.stringify(response.body, null, 2));
    expect(response.body.success).toBe(true);

    response = await TestUtils.request
      .post('/fireblocks/start')
      .send({ 'wallet-id': walletId, 'xpub-id': 'stub' });
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
      .send({ 'wallet-id': walletId, 'xpub-id': 'stub' });
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
