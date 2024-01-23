import TestUtils from './test-utils';
import { lock, lockTypes } from '../src/lock';
import * as constants from '../src/helpers/constants';

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
  },
};
const connectMock = jest.spyOn(hsm, 'connect').mockResolvedValue(hsmConnectionMock);
const disconnectMock = jest.spyOn(hsm, 'disconnect').mockImplementation(() => {});

const walletId = 'stub_hsm_start';
const hsmKeyName = 'stub_hsm_key';

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
  })

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
  });

  it('should manage the hardWallet map on start and stop', async () => {
    const response = await TestUtils.request
      .post('/hsm/start')
      .send({ 'wallet-id': walletId, 'hsm-key': hsmKeyName });
    expect(response.body.success).toBe(true);
    expect(walletsService.hardWalletIds.has(walletId)).toBe(true);

    await TestUtils.stopWallet({ walletId });
    expect(walletsService.hardWalletIds.has(walletId)).toBe(false);
  });
});
