import { HathorWallet } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const { initializedWallets } = require('../src/services/wallets.service');

const walletId = 'health_wallet';

describe('healthcheck api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  afterEach(async () => {
    await TestUtils.stopMocks();
    TestUtils.startMocks();
    TestUtils.resetRequest();
  });

  describe('/health', () => {
    it('should return 200 when all components are healthy', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        200,
        { status: 'pass' }
      );

      const response = await TestUtils.request
        .set({ 'x-wallet-ids': walletId })
        .get('/health');
      expect(response.status).toBe(200);

      expect(response.body).toStrictEqual({
        status: 'pass',
        description: 'Wallet-headless health',
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentType: 'fullnode',
              status: 'pass',
              output: 'Fullnode is responding',
              time: expect.any(String),
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentType: 'service',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
            },
          ],
        }
      });
    });

    it('should return 503 when the wallet is not ready', async () => {
      const wallet = initializedWallets.get(walletId);
      const originalIsReady = wallet.isReady;
      const originalState = wallet.state;

      wallet.isReady = () => false;
      wallet.state = HathorWallet.SYNCING;

      const response = await TestUtils.request
        .set({ 'x-wallet-ids': walletId })
        .get('/health');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Wallet-headless health',
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentType: 'internal',
              status: 'fail',
              output: 'Wallet is not ready. Current state: Syncing',
              time: expect.any(String),
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentType: 'fullnode',
              status: 'pass',
              output: 'Fullnode is responding',
              time: expect.any(String),
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentType: 'service',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
            },
          ],
        }
      });

      wallet.isReady = originalIsReady;
      wallet.state = originalState;
    });

    it('should return 503 when the fullnode is not healthy', async () => {
      TestUtils.httpMock.onGet('/version').reply(503, { status: 'fail' });

      const response = await TestUtils.request
        .set({ 'x-wallet-ids': walletId })
        .get('/health');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.description).toBe('Wallet-headless health');

      expect(response.body.checks['Wallet health_wallet'][0].componentName).toBe('Wallet health_wallet');
      expect(response.body.checks['Wallet health_wallet'][0].componentType).toBe('internal');
      expect(response.body.checks['Wallet health_wallet'][0].output).toBe('Wallet is ready');
      expect(response.body.checks['Wallet health_wallet'][0].status).toBe('pass');

      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentType).toBe('fullnode');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].status).toBe('fail');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].output).toBe('Fullnode reported as unhealthy: {"status":"fail"}');

      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentType).toBe('service');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].status).toBe('pass');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].output).toBe('Tx Mining Service is healthy');

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Wallet-headless health',
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentType: 'fullnode',
              status: 'fail',
              output: 'Fullnode reported as unhealthy: {"status":"fail"}',
              time: expect.any(String),
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentType: 'service',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
            },
          ],
        }
      });
    });

    it('should return 503 when the tx mining service is not healthy', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        503,
        { status: 'fail' }
      );

      const response = await TestUtils.request
        .set({ 'x-wallet-ids': walletId })
        .get('/health');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Wallet-headless health',
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentType: 'fullnode',
              status: 'pass',
              output: 'Fullnode is responding',
              time: expect.any(String),
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentType: 'service',
              status: 'fail',
              output: 'Tx Mining Service reported as unhealthy: {"status":"fail"}',
              time: expect.any(String),
            },
          ],
        }
      });
    });
  });

  describe('/health/wallets', () => {
    it('should return 400 when the wallet has been started, but the header was not passed', async () => {
      const response = await TestUtils.request
        .get('/health/wallets');
      expect(response.status).toBe(400);

      expect(response.body).toStrictEqual({
        success: false,
        message: 'Header \'X-Wallet-Ids\' is required.',
      });
    });

    it('should return 400 when the wallet has not been started', async () => {
      const response = await TestUtils.request
        .set({ 'x-wallet-ids': `invalid-id,${walletId}` })
        .get('/health/wallets');
      expect(response.status).toBe(400);

      expect(response.body).toStrictEqual({
        success: false,
        message: 'Invalid wallet id parameter: invalid-id',
      });
    });

    it('should return 503 when the wallet is not ready', async () => {
      const wallet = initializedWallets.get(walletId);
      const originalIsReady = wallet.isReady;
      const originalState = wallet.state;
      wallet.isReady = () => false;
      wallet.state = HathorWallet.SYNCING;

      const response = await TestUtils.request
        .set({ 'x-wallet-ids': walletId })
        .get('/health/wallets');
      expect(response.status).toBe(503);

      wallet.isReady = originalIsReady;
      wallet.state = originalState;
    });
  });

  describe('/health/fullnode', () => {
    it('should return 503 when the request to the fullnode fails', async () => {
      TestUtils.httpMock.onGet('/version').networkError();

      const response = await TestUtils.request
        .get('/health/fullnode');

      expect(response.status).toBe(503);
      expect(response.body).toStrictEqual({
        status: 'fail',
        output: 'Error getting fullnode health: Network Error',
        componentName: 'Fullnode http://fakehost:8083/v1a/',
        componentType: 'fullnode',
        time: expect.any(String),
      });
    });

    it('should return 503 when the fullnode reports as unhealthy', async () => {
      TestUtils.httpMock.onGet('/version').reply(503, { status: 'fail' });

      const response = await TestUtils.request
        .get('/health/fullnode');

      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        output: 'Fullnode reported as unhealthy: {"status":"fail"}',
        componentName: 'Fullnode http://fakehost:8083/v1a/',
        componentType: 'fullnode',
        time: expect.any(String),
      });
    });

    it('should return 200 when the fullnode is ready', async () => {
      const response = await TestUtils.request
        .get('/health/fullnode');
      expect(response.status).toBe(200);

      expect(response.body).toStrictEqual({
        status: 'pass',
        output: 'Fullnode is responding',
        componentName: 'Fullnode http://fakehost:8083/v1a/',
        componentType: 'fullnode',
        time: expect.any(String),
      });
    });
  });

  describe('/health/tx-mining-service', () => {
    it('should return 503 when the tx mining service reports as unhealthy', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        503,
        { status: 'fail' }
      );

      const response = await TestUtils.request
        .get('/health/tx-mining');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        output: 'Tx Mining Service reported as unhealthy: {"status":"fail"}',
        componentName: 'TxMiningService http://fake.txmining:8084/',
        componentType: 'service',
        time: expect.any(String),
      });
    });

    it('should return 503 when the request to the tx mining service fails', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').networkError();

      const response = await TestUtils.request
        .get('/health/tx-mining');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        output: 'Error getting tx-mining-service health: Network Error',
        componentName: 'TxMiningService http://fake.txmining:8084/',
        componentType: 'service',
        time: expect.any(String),
      });
    });

    it('should return 200 when the tx mining service is healthy', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        200,
        { status: 'pass' }
      );

      const response = await TestUtils.request
        .get('/health/tx-mining');
      expect(response.status).toBe(200);

      expect(response.body).toStrictEqual({
        status: 'pass',
        output: 'Tx Mining Service is healthy',
        componentName: 'TxMiningService http://fake.txmining:8084/',
        componentType: 'service',
        time: expect.any(String),
      });
    });
  });
});
