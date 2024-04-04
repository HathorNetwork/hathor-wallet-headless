import TestUtils from './test-utils';
import { lock, lockTypes } from '../src/lock';
import * as constants from '../src/helpers/constants';
import settingsFixture from './__fixtures__/settings-fixture';

const { hsm } = require('@dinamonetworks/hsm-dinamo');

const walletsService = require('../src/services/wallets.service');

const hsmConnectionMock = {
  blockchain: {
    getKeyInfo: jest.fn().mockResolvedValue({
      type: hsm.enums.BLOCKCHAIN_KEYS.BIP32_XPRV,
      ver: hsm.enums.VERSION_OPTIONS.BIP32_HTR_MAIN_NET,
    }),
    createBip32ChildKeyDerivation: jest.fn(),
    getPubKey: jest.fn().mockResolvedValue('xpub6Bmit3YXcjd1GE84dBCbAqUQQs2oi7jG5wGCEPLJTXiuS5JykhP4bNzz2hhP2JH7nByeVkQWFB4VBti9uQvqK7dKW5LJNNKyLbYmAd3PEjP'),
    sign: jest.fn(),
  },
};
const connectMock = jest.spyOn(hsm, 'connect').mockResolvedValue(hsmConnectionMock);
const disconnectMock = jest.spyOn(hsm, 'disconnect').mockImplementation(() => {});

const walletId = 'stub_hsm_start';
const hsmKeyName = 'stub_hsm_key';

const config = settingsFixture._getDefaultConfig();
jest.doMock('../src/config', () => ({
  __esModule: true,
  default: config,
}));

describe('start HSM api', () => {
  afterEach(async () => {
    await TestUtils.stopWallet({ walletId });
    lock.unlock(lockTypes.HSM);
  });

  it('should not start a wallet without a wallet-id', async () => {
    const response = await TestUtils.request
      .post('/hsm/start')
      .send({ 'hsm-key': hsmKeyName });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(`wallet-id' is required`);
    expect(connectMock).toHaveBeenCalledTimes(0);
    expect(disconnectMock).toHaveBeenCalledTimes(0);
  });

  it('should not start a wallet without a hsm-key', async () => {
    const response = await TestUtils.request
      .post('/hsm/start')
      .send({ 'wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain(`hsm-key' is required`);
    expect(connectMock).toHaveBeenCalledTimes(0);
    expect(disconnectMock).toHaveBeenCalledTimes(0);
  });

  it('should not start a wallet if hsm was not completely configured', async () => {
    const newConfig = settingsFixture._getDefaultConfig();

    // Missing host
    newConfig.hsmHost = null;
    newConfig.hsmUsername = 'hathor-test';
    newConfig.hsmPassword = 'hathor-pass';
    settingsFixture._setConfig(newConfig);
    let response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName,
      });
    ensureExpectedResults(response);

    // Missing username
    newConfig.hsmHost = '127.0.0.1';
    newConfig.hsmUsername = null;
    newConfig.hsmPassword = 'hathor-pass';
    settingsFixture._setConfig(newConfig);

    response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName,
      });
    ensureExpectedResults(response);

    // Missing password
    newConfig.hsmHost = '127.0.0.1';
    newConfig.hsmUsername = 'hathor-test';
    newConfig.hsmPassword = null;
    settingsFixture._setConfig(newConfig);

    response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName,
      });
    ensureExpectedResults(response);

    // Return values back to default
    settingsFixture._setConfig(settingsFixture._getDefaultConfig());

    /**
     * Validates the response object from the request and also the connect/disconnect mocks
     * to ensure no call was made during the requests.
     * @param _response
     */
    function ensureExpectedResults(_response) {
      expect(_response.status).toBe(200);
      expect(_response.body.success).toBe(false);
      expect(_response.body.message).toContain(`HSM integration is not configured`);
      expect(connectMock).toHaveBeenCalledTimes(0);
      expect(disconnectMock).toHaveBeenCalledTimes(0);
    }
  });

  it('should not start a wallet with a key that does not exist on hsm', async () => {
    // 5004 means key not found error
    hsmConnectionMock.blockchain.getKeyInfo.mockRejectedValueOnce({ errorCode: 5004 });

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Key does not exist on HSM.');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should return a treated message on unexpected error on key retrieval', async () => {
    hsmConnectionMock.blockchain.getKeyInfo.mockRejectedValueOnce({ message: 'Fake failure' });

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Unexpected error on key retrieval: Fake failure');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should not accept a hsm-key that does not contain a bip32 xPriv', async () => {
    hsmConnectionMock.blockchain.getKeyInfo.mockResolvedValueOnce({
      type: 'not-bip32'
    });

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('hsm-key is not a valid xPriv.');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should not accept a bip32 key with version not compatible with Hathor', async () => {
    hsmConnectionMock.blockchain.getKeyInfo.mockResolvedValueOnce({
      type: hsm.enums.BLOCKCHAIN_KEYS.BIP32_XPRV,
      ver: 'hathor-incompatible',
    });

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('hsm-key is not a valid Hathor xPriv.');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should return a treated message on unexpected error on getXPubFromKey', async () => {
    hsmConnectionMock.blockchain.getPubKey.mockRejectedValueOnce({ message: 'getPubKey failure' });

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Unexpected error on HSM xPub derivation: getPubKey failure');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should handle HSM connection errors gracefully', async () => {
    connectMock.mockRejectedValueOnce({ message: 'Conn failure' });

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Unexpected error on HSM connection: Conn failure');
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should handle HSM connection lock', async () => {
    // Simulate that a connection with the HSM is already being used
    lock.lock(lockTypes.HSM);

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(constants.hsmBusyErrorMessage);
    expect(connectMock).toHaveBeenCalledTimes(0);
    expect(disconnectMock).toHaveBeenCalledTimes(0);
  });

  it('should start a wallet successfully', async () => {
    // Using the test default mocked values

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);

    await TestUtils.waitReady({ walletId });
  });

  it('should not start two wallets with the same wallet-id', async () => {
    let response = await TestUtils.request
      .post('/hsm/start')
      .send({ 'wallet-id': walletId, 'hsm-key': hsmKeyName });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);

    response = await TestUtils.request
      .post('/hsm/start')
      .send({ 'wallet-id': walletId, 'hsm-key': hsmKeyName });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.errorCode).toEqual('WALLET_ALREADY_STARTED');
    // No connection attempts should have happened
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledTimes(1);

    // Ensure the wallet is ready before finishing the test and requesting it to be stopped
    await TestUtils.waitReady({ walletId });
  });

  it('should manage the hsmWallet map on start and stop', async () => {
    const response = await TestUtils.request
      .post('/hsm/start')
      .send({ 'wallet-id': walletId, 'hsm-key': hsmKeyName });
    expect(response.body.success).toBe(true);
    expect(walletsService.hsmWalletIds.has(walletId)).toBe(true);

    // Ensure the wallet is ready before requesting it to be stopped
    await TestUtils.waitReady({ walletId });

    await TestUtils.stopWallet({ walletId });
    expect(walletsService.hsmWalletIds.has(walletId)).toBe(false);
  });

  it('should send', async () => {
    // This xpubkey will generate the addresses with mocked balance to send transactions
    const xpubkey = 'xpub6C95ufyyhEr2ntyGGfeHjyvxffmNZQ7WugyChhu1Fzor1tMUc4K2MUdwkcJoTzjVkg46hurWWU9gvZoivLiDk6MdsKukz3JiX5Fib2BDa2T';
    hsmConnectionMock.blockchain.getPubKey.mockResolvedValueOnce(xpubkey);
    hsmConnectionMock.blockchain.sign.mockResolvedValue(Buffer.from([0x01, 0x30, 0xCA, 0xFE]));

    const response = await TestUtils.request
      .post('/hsm/start')
      .send({
        'wallet-id': walletId,
        'hsm-key': hsmKeyName
      });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    await TestUtils.waitReady({ walletId });
    const response2 = await TestUtils.request
      .post('/wallet/simple-send-tx')
      .send({
        address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
        value: 1,
      })
      .set({ 'x-wallet-id': walletId });

    expect(hsmConnectionMock.blockchain.sign).toHaveBeenCalledTimes(1);
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(true);
  });
});
