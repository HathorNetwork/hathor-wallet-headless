import TestUtils from './test-utils';
import { WALLET_CONSTANTS } from './integration/configuration/test-constants';
import settings from '../src/settings';
import { initializedWallets } from '../src/services/wallets.service';

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
    expect(response.body.success).toBe(false);
  });

  it('should not start a wallet without a seedKey', async () => {
    const response = await TestUtils.request
      .post('/start')
      .send({ 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should not start a wallet without a wallet-id', async () => {
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should not start two wallets with same wallet-id', async () => {
    // First start
    const response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Second start
    const response2 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(false);
    expect(response2.body.errorCode).toEqual('WALLET_ALREADY_STARTED');
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
    const config = settings.getConfig();
    config.confirmFirstAddress = true;
    settings._setConfig(config);

    let response = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    await TestUtils.waitReady({ walletId });

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

    config.confirmFirstAddress = null;
    settings._setConfig(config);
  });

  it('should start a MultiSig wallet if multisig is true', async () => {
    const config = settings.getConfig();
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);

    const response1 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(true);
    await TestUtils.waitReady({ walletId });

    const response2 = await TestUtils.request
      .get('/wallet/address')
      .query({ index: 0 })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.info('[start api] multisig response', response2.body);
    expect(response2.status).toBe(200);
    expect(response2.body.address).toBe(TestUtils.multisigAddresses[0]);

    config.multisig = {};
    settings._setConfig(config);
  });

  it('should not start a incorrectly configured MultiSig if multisig is true', async () => {
    const config = settings.getConfig();
    config.multisig = {};
    settings._setConfig(config);

    const response1 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(false);

    config.multisig = TestUtils.multisigData;
    config.multisig[TestUtils.seedKey].total = 6;
    settings._setConfig(config);

    const response2 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(false);

    config.multisig[TestUtils.seedKey].total = 5;
    config.multisig[TestUtils.seedKey].numSignatures = 6;
    settings._setConfig(config);

    const response3 = await TestUtils.request
      .post('/start')
      .send({ seedKey: TestUtils.seedKey, 'wallet-id': walletId, multisig: true });
    expect(response3.status).toBe(200);
    expect(response3.body.success).toBe(false);

    config.multisig = {};
    settings._setConfig(config);
  });
  it('should not use gap-limit policy data unless strictly configured to gap-limit', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      gapLimit: 7,
    };

    const response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    expect(response.body).toHaveProperty('success', true);

    // The gapLimit is ignored and the default configuration is used
    const wallet = initializedWallets.get(walletId);
    await expect(wallet.storage.getScanningPolicy()).resolves.toBe('gap-limit');
    await expect(wallet.getGapLimit()).resolves.not.toBe(7);
  });
  it('should start a wallet with the configured gap-limit', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      scanPolicy: 'gap-limit',
      gapLimit: 7,
    };

    const response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    expect(response.body).toHaveProperty('success', true);

    // Check that the wallet actually used the given gap-limit
    const wallet = initializedWallets.get(walletId);
    await expect(wallet.storage.getScanningPolicy()).resolves.toBe('gap-limit');
    await expect(wallet.getGapLimit()).resolves.toBe(7);
  });
  it('should start a wallet with index-limit', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      scanPolicy: 'index-limit',
    };

    const response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    expect(response.body).toHaveProperty('success', true);
    await TestUtils.waitReady({ walletId });

    // Check that the wallet actually used the given gap-limit
    const wallet = initializedWallets.get(walletId);
    await expect(wallet.storage.getScanningPolicy()).resolves.toBe('index-limit');
    await expect(wallet.storage.getIndexLimit()).resolves.toMatchObject({
      startIndex: 0,
      endIndex: 0,
    });
    await expect(wallet.storage.store.addressCount()).resolves.toBe(1);
  });
  it('should start a wallet with index-limit and use the configuration', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      scanPolicy: 'index-limit',
      policyStartIndex: 5,
      policyEndIndex: 10,
    };

    const response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    expect(response.body).toHaveProperty('success', true);
    await TestUtils.waitReady({ walletId });

    // Check that the wallet actually used the given gap-limit
    const wallet = initializedWallets.get(walletId);
    await expect(wallet.storage.getScanningPolicy()).resolves.toBe('index-limit');
    await expect(wallet.storage.getIndexLimit()).resolves.toMatchObject({
      startIndex: 5,
      endIndex: 10,
    });
    // We will load 6 addresses, from 5 to 10 (inclusive)
    await expect(wallet.storage.store.addressCount()).resolves.toBe(6);
  });
});
