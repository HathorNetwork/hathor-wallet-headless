import supertest from 'supertest';
// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';
import winston from 'winston';
import MockAdapter from 'axios-mock-adapter';
import { Server } from 'mock-socket';
import app from '../src/index';
import config from '../src/config';
import httpFixtures from './__fixtures__/http-fixtures';
import wsFixtures from './__fixtures__/ws-fixtures';
import { HathorWallet } from '@hathor/wallet-lib';

const WALLET_ID = 'stub_wallet';
const SEED_KEY = 'stub_seed';

const MULTISIG_XPUB = 'xpub6CvvCBtHqFfErbcW2Rv28TmZ3MqcFuWQVKGg8xDzLeAwEAHRz9LBTgSFSj7B99scSvZGbq6TxAyyATA9b6cnwsgduNs9NGKQJnEQr3PYtwK';
const MULTISIG_DATA = {
  stub_seed: {
    minSignatures: 3,
    total: 5,
    pubkeys: [
      MULTISIG_XPUB,
      'xpub6CA16g2qPwukWAWBMdJKU3p2fQEEi831W3WAs2nesuCzPhbrG29aJsoRDSEDT4Ac3smqSk51uuv6oujU3MAAL3d1Nm87q9GDwE3HRGQLjdP',
      'xpub6BwNT613Vzy7ARVHDEpoX23SMBEZQMJXdqTWYjQKvJZJVDBjEemU38exJEhc6qbFVc4MmarN68gUKHkyZ3NEgXXCbWtoXXGouHpwMEcXJLf',
      'xpub6DCyPHg4AwXsdiMh7QSTHR7afmNVwZKHBBMFUiy5aCYQNaWp68ceQXYXCGQr5fZyLAe5hiJDdXrq6w3AXzvVmjFX9F7EdM87repxJEhsmjL',
      'xpub6CgPUcCCJ9pAK7Rj52hwkxTutSRv91Fq74Hx1SjN62eg6Mp3S3YCJFPChPaDjpp9jCbCZHibBgdKnfNdq6hE9umyjyZKUCySBNF7wkoG4uK',
    ],
  }
};

const request = supertest(app);

const httpMock = new MockAdapter(axios);

const wsUrl = config.server.replace(/https?/, 'ws').replace('/v1a', '/v1a/ws');
const wsMock = new Server(wsUrl);

class TestUtils {
  static socket = null;

  static httpMock = httpMock;

  static wsMock = wsMock;

  static seedKey = SEED_KEY;

  static walletId = WALLET_ID;

  static multisigXpub = MULTISIG_XPUB;

  static multisigData = MULTISIG_DATA;

  static logger = null;

  static addresses = [
    'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
    'WmtWgtk5GxdcDKwjNwmXXn74nQWTPWhKfx',
    'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
    'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp',
    'WVGxdgZMHkWo2Hdrb1sEFedNdjTXzjvjPi',
    'Wc4dKp6hBgr5PU9gBmzJofc93XZGAEEUXD',
    'WUujvZnk3LMbFWUW7CnZbjn5JZzALaqLfm',
    'WYiD1E8n5oB9weZ8NMyM3KoCjKf1KCjWAZ',
    'WXN7sf6WzhpESgUuRCBrjzjzHtWTCfV8Cq',
    'WYaMN32qQ9CAUNsDnbtwi1U41JY9prYhvR',
    'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
    'WgpRs9NxhkBPxe7ptm9RcuLdABb7DdVUA5',
    'WPzpVP34vx6X5Krj4jeiQz9VW87F4LEZnV',
    'WSn9Bn6EDPSWZqNQdpV3FxGjpTEMsqQHYQ',
    'WmYnieT3vzzY83eHphQHs6HJ5mYyPwcKSE',
    'WZfcHjgkfK9UroTzpiricB6gtg99QKraG1',
    'WiHovoQ5ZLKPpQjZYkLVeoVgP7LoVLK518',
    'Wi5AvNTnh4mZft65kzsRbDYEPGbTRhd5q3',
    'Weg6WEncAEJs5qDbGUxcLTR3iycM3hrt4C',
    'WSVarF73e6UVccGwb44FvTtqFWsHQmjKCt',
    'Wc5YHn861241iLY42mFT8z1dT1UdsNWkfs',
    'WU6KGNPuaRG4VCKC1fsKDh4fRZGbkqxG8Y',
    'WTTdWuDGGsu7X5yjfTzdxR1mQBZkjQfi3V',
    'WaMaVdMh5Je7qPLjaiePX96uWMwX5hdPVi'
  ];

  static multisigAddresses = [
    'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
    'wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG',
    'wQQWdSZwp2CEGKsTvvbJ7i8HfHuV2i5QVQ',
    'wfrtq9cMe1YfixVgSKXQNQ5hjsmR4hpjP6',
    'wQG7itjdtZBsNTk9TG4f1HrehyQiAEMN18',
    'wfgSqHUHPtmj2GDy8YfasbPPcFh8L1GPMA',
    'wgZbCEMHHnhftCAwj7CRBmfi5TgBhfMZbk',
    'wdz9NeMac7jyVeP2WK4BJWsM1zpd9tgsBb',
    'wPs7WaRCqwC89uHycLbctDGmWPgH9oZvjp',
    'wWJJxvr6oSk7WZdE9rpSRMoE6ZqJ3i8VDc',
    'wbuDJtmM7vg8at2h5o3pTCHE4SASEFYusr',
    'wPNkywbiw8UHbRQkD3nZ3EHMQsjyTamh9u',
    'wQBNidXXYpE943BgydUNtarAwNzk612Yip',
    'wh2eCGzUK9rLThr5D6tyCfckHpBjS97ERA',
    'wZvajxVp3LabcZiY3XPrivrXiSS6wphRu7',
    'wgPbL1WzbrEntepHRC92UX6mA2EmaqfDqt',
    'wbdx4g3rucX3WHmZRXjPEKtRfZ7XSnCGKf',
    'wiKTnqSN11ukuCWEXRVrRTTPo2mw4fGue3',
    'wQ4aQP4YqJqfwshLggR2w1Gg3UFhhKhVKs',
    'wca2xk9S2MVn2UrKh78UScdwXz3xrTp8Ky',
    'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau',
  ];

  static get request() {
    return request;
  }

  static async startWallet({
    seedKey = SEED_KEY,
    walletId = WALLET_ID,
    multisig = false,
    preCalculatedAddresses = null,
  } = {}) {
    const params = {
      'wallet-id': walletId,
      seedKey,
      multisig,
    };
    if (preCalculatedAddresses != null) {
      params.preCalculatedAddresses = preCalculatedAddresses;
    }
    const response = await request
      .post('/start')
      .send(params);

    if (response.status !== 200) {
      throw new Error('Unable to start the wallet');
    }
    if (!response.body.success) {
      throw new Error(response.body.message);
    }

    while (true) {
      const res = await request
        .get('/wallet/status')
        .set({ 'x-wallet-id': walletId });
      if (res.body && res.body.success !== false) {
        break;
      }
      await new Promise(resolve => {
        setTimeout(resolve, 500);
      });
    }
  }

  static async walletStatus({ walletId = WALLET_ID }) {
    const response = await request.get('/wallet/status').set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[TestUtil] wallet status', { walletId, body: response.body });
    return response.body?.statusCode;
  }

  static async isWalletReady({ walletId = WALLET_ID }) {
    const statusCode = await TestUtils.walletStatus({ walletId });
    if ((!statusCode) || (statusCode === HathorWallet.ERROR)) {
      throw new Error(`Wallet ${walletId} initialization failed.`);
    }
    return statusCode === HathorWallet.READY;
  }

  static async stopWallet({ walletId = WALLET_ID } = {}) {
    const checkAndStop = async tries => {
      if (tries >= 5) {
        TestUtils.logger.info('[TestUtils:stopWallet] wallet could not be stopped', { tries, walletId });
        throw new Error(`Too many retries trying to stop the wallet ${walletId}`);
      }
      const statusCode = await TestUtils.walletStatus({ walletId });
      let response;

      switch (statusCode) {
        case HathorWallet.CONNECTING:
        case HathorWallet.SYNCING:
          // we nee to wait and try again
          TestUtils.logger.info('[TestUtils:stopWallet] wallet is not ready', { statusCode, walletId });
          return checkAndStop(tries + 1);
        case HathorWallet.READY:
          response = await request.post('/wallet/stop').set({ 'x-wallet-id': walletId });
          TestUtils.logger.debug('[TestUtil:stopWallet] stop wallet request', { walletId, body: response.body });
          break;
        case HathorWallet.CLOSED:
          TestUtils.logger.info('[TestUtils:stopWallet] wallet is already closed', { statusCode, walletId });
          break;
        case HathorWallet.ERROR:
        default:
          TestUtils.logger.info('[TestUtils:stopWallet] something has happened', { statusCode, walletId });
      }
      return Promise.resolve();
    };

    return checkAndStop(0);
  }

  static startMocks() {
    // http mocks
    httpMock.onGet('/version').reply(200, httpFixtures['/v1a/version']);
    httpMock
      .onGet('/thin_wallet/address_history')
      .reply(200, httpFixtures['/thin_wallet/address_history']);
    httpMock.onPost('push_tx').reply(200, httpFixtures['/v1a/push_tx']);
    httpMock.onPost('submit-job').reply(200, httpFixtures['submit-job']);
    httpMock.onGet('job-status').reply(200, httpFixtures['job-status']);

    // websocket mocks
    wsMock.on('connection', socket => {
      TestUtils.socket = socket;
      socket.send(JSON.stringify(wsFixtures.dashboard));
      socket.on('message', data => {
        const jsonData = JSON.parse(data);
        if (jsonData.type === 'subscribe_address') {
          // Only for testing purposes
          socket.send(
            JSON.stringify({
              type: 'subscribe_success',
              address: jsonData.address,
            })
          );
        } else if (jsonData.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      });
    });
  }

  static stopMocks() {
    httpMock.reset();
    return new Promise(resolve => {
      wsMock.stop(resolve);
    });
  }

  static reorderHandlers() {
    Object.values(httpMock.handlers).forEach(handler => handler.reverse());
  }

  static initLogger() {
    TestUtils.logger = winston.createLogger({
      level: 'silly',
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
          level: 'silly',
        }),
      ],
    });
  }
}

export default TestUtils;
