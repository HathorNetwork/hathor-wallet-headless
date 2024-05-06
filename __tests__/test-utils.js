import supertest from 'supertest';
import axios from 'axios';
import { get } from 'lodash';
import winston from 'winston';
import MockAdapter from 'axios-mock-adapter';
import { Server } from 'mock-socket';
import { HathorWallet } from '@hathor/wallet-lib';
import createApp from '../src/app';
import settings from '../src/settings';
import httpFixtures from './__fixtures__/http-fixtures';
import fireblocksFixtures from './__fixtures__/fireblocks';
import wsFixtures from './__fixtures__/ws-fixtures';

const config = settings.getConfig();

const WALLET_ID = 'stub_wallet';
const SEED_KEY = 'stub_seed';

/* eslint-disable max-len */
// XXX: These words are not used on the tests but are here to document which words generated the multisig xpubs below which are used on tests.
// The first one generated the MULTISIG_XPUB and is the same as the words on the config fixture used for p2pkh tests.
// 'upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind'
// 'sample garment fun depart various renew require surge service undo cinnamon squeeze hundred nasty gasp ridge surge defense relax turtle wet antique october occur'
// 'intact wool rigid diary mountain issue tiny ugly swing rib alone base fold satoshi drift poverty autumn mansion state globe plug ancient pudding hope'
// 'monster opinion bracket aspect mask labor obvious hat matrix exact canoe race shift episode plastic debris dash sort motion juice leg mushroom maximum evidence'
// 'tilt lab swear uncle prize favorite river myth assault transfer venue soap lady someone marine reject fork brain swallow notice glad salt sudden pottery'
/* eslint-enable max-len */
const MULTISIG_XPUB = 'xpub6CvvCBtHqFfErbcW2Rv28TmZ3MqcFuWQVKGg8xDzLeAwEAHRz9LBTgSFSj7B99scSvZGbq6TxAyyATA9b6cnwsgduNs9NGKQJnEQr3PYtwK';
const MULTISIG_DATA = {
  stub_seed: {
    numSignatures: 3,
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

let request; let
  server;

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

  static async walletStatus({ walletId = WALLET_ID, firstAddress = null }) {
    const params = { 'x-wallet-id': walletId };
    if (firstAddress) {
      params['x-first-address'] = firstAddress;
    }
    const response = await request.get('/wallet/status').set(params);
    TestUtils.logger.debug('[TestUtil:walletStatus] wallet status', { walletId, body: response.body });
    return response;
  }

  static async waitReady({
    walletId = WALLET_ID,
    exitIfClosed = false,
    retries = 3,
    firstAddress = null,
  } = {}) {
    for (let i = 0; i < retries; i++) {
      const res = await TestUtils.walletStatus({ walletId, firstAddress });
      if (res.body?.success !== false) {
        return true;
      }
      if (res.body?.message === 'Invalid wallet id parameter.') {
        // The wallet does not exist
        return false;
      }
      if (res.body?.statusCode === HathorWallet.ERROR) {
        throw new Error(res.body?.message);
      }
      if (exitIfClosed && res.body?.statusCode === HathorWallet.CLOSED) {
        return false;
      }
      await new Promise(resolve => {
        setTimeout(resolve, 500);
      });
    }
    TestUtils.logger.debug('[TestUtil:waitReady] too many attempts', { walletId });
    return false;
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

    await TestUtils.waitReady({ walletId, retries: 10 });
  }

  static async stopWallet({ walletId = WALLET_ID } = {}) {
    const isReady = await TestUtils.waitReady({ walletId, exitIfClosed: true });
    if (!isReady) {
      TestUtils.logger.debug('[TestUtil:stopWallet] wallet is already stopped', { walletId });
      return;
    }
    const response = await request.post('/wallet/stop').set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[TestUtil:stopWallet] stop wallet request', { walletId, body: response.body });
  }

  static startMocks() {
    // http mocks
    httpMock.onGet('http://fakehost:8083/v1a/version').reply(200, httpFixtures['http://fakehost:8083/v1a/version']);
    httpMock.onGet('http://fakehost:8083/v1a/health').reply(200, httpFixtures['http://fakehost:8083/v1a/health']);
    httpMock
      .onGet('/thin_wallet/address_history')
      .reply(200, httpFixtures['/thin_wallet/address_history']);
    httpMock.onPost('push_tx').reply(200, httpFixtures['/v1a/push_tx']);
    httpMock.onPost('submit-job').reply(200, httpFixtures['submit-job']);
    httpMock.onGet('job-status').reply(200, httpFixtures['job-status']);
    httpMock.onGet('/thin_wallet/token').reply(200, httpFixtures['/thin_wallet/token']);
    httpMock.onGet('/transaction').reply(conf => {
      // Depending on the ID parameter, we must return a nano contract transaction
      if (get(conf, 'params.id') === '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a') {
        return [200, httpFixtures['/transaction?id=5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a']];
      }

      return [200, httpFixtures['/transaction']];
    });
    httpMock.onGet('/getmininginfo').reply(200, httpFixtures['/getmininginfo']);
    httpMock.onGet('http://fake.txmining:8084/health').reply(200, httpFixtures['http://fake.txmining:8084/health']);
    httpMock.onGet('/nano_contract/state').reply(200, httpFixtures['/nano_contract/state']);
    httpMock.onGet('/nano_contract/history').reply(200, httpFixtures['/nano_contract/history']);
    httpMock.onGet('/nano_contract/blueprint').reply(200, httpFixtures['/nano_contract/blueprint']);

    // Fireblocks mock
    httpMock.onGet(/http:\/\/fake-fireblocks-url\/v1\/transactions\/external_tx_id\/*/).reply(fireblocksFixtures.transaction_status);
    httpMock.onGet(/http:\/\/fake-fireblocks-url\/v1\/vault\/public_key_info*/).reply(200, fireblocksFixtures.public_key_info);
    httpMock.onPost('http://fake-fireblocks-url/v1/transactions').reply(200);

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

  static startServer() {
    return new Promise((resolve, reject) => {
      const app = createApp(config);
      server = app.listen(8088, err => {
        if (err) {
          return reject(err);
        }

        // Ensures the supertest agent will be bound to the correct express port
        request = supertest.agent(server);
        return resolve();
      });
    });
  }

  static resetRequest() {
    // This can be used to reset the supertest agent and avoid interferences between tests,
    // since everything is a singleton in this file
    request = supertest.agent(server);
  }

  static stopMocks() {
    httpMock.reset();
    server.close();
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
