import { HathorWallet } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const { initializedWallets } = require('../src/services/wallets.service');

const walletId = 'health_wallet';
const anotherWalletId = 'another_health_wallet';

describe('healthcheck api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
    await TestUtils.startWallet({
      walletId: anotherWalletId,
      preCalculatedAddresses: TestUtils.addresses
    });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    await TestUtils.stopWallet({ walletId: anotherWalletId });
  });

  afterEach(async () => {
    await TestUtils.stopMocks();
    TestUtils.startMocks();
    TestUtils.resetRequest();
  });

  describe('/health', () => {
    it('should return 400 when the x-wallet-id is invalid', async () => {
      const response = await TestUtils.request
        .query({ wallet_ids: 'invalid' })
        .get('/health');

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        success: false,
        message: 'Invalid wallet id parameter: invalid',
      });
    });

    it('should return 400 when no component is included', async () => {
      const response = await TestUtils.request.get('/health');

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        success: false,
        message: 'At least one component must be included in the health check',
      });
    });

    it('should return 200 when all components are healthy', async () => {
      const response = await TestUtils.request
        .query({
          include_tx_mining: true,
          include_fullnode: true,
          wallet_ids: `${walletId},${anotherWalletId}`
        })
        .get('/health');
      expect(response.status).toBe(200);

      expect(response.body).toStrictEqual({
        status: 'pass',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 200,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Wallet another_health_wallet': [
            {
              componentName: 'Wallet another_health_wallet',
              componentId: 'another_health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentId: 'http://fakehost:8083/v1a/',
              componentType: 'http',
              status: 'pass',
              output: 'Fullnode is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentId: 'http://fake.txmining:8084/',
              componentType: 'http',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
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
        .query({ include_tx_mining: true, include_fullnode: true, wallet_ids: walletId })
        .get('/health');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 503,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'fail',
              output: 'Wallet is not ready. Current state: Syncing',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentId: 'http://fakehost:8083/v1a/',
              componentType: 'http',
              status: 'pass',
              output: 'Fullnode is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentId: 'http://fake.txmining:8084/',
              componentType: 'http',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
        }
      });

      wallet.isReady = originalIsReady;
      wallet.state = originalState;
    });

    /**
     * This is a case where the fullnode is not healthy, but it returns 200.
     * It's possible for it to do this, because there its health endpoint accepts a parameter
     * to make it return 200 even if it's unhealthy.
     */
    it('should return 503 when the fullnode is not healthy and returns 200', async () => {
      TestUtils.httpMock.onGet('http://fakehost:8083/v1a/health').reply(200, { status: 'fail' });

      const response = await TestUtils.request
        .query({ include_tx_mining: true, include_fullnode: true, wallet_ids: walletId })
        .get('/health');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 503,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentId: 'http://fakehost:8083/v1a/',
              componentType: 'http',
              status: 'fail',
              output: 'Fullnode reported as unhealthy: {"status":"fail"}',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentId: 'http://fake.txmining:8084/',
              componentType: 'http',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
        }
      });
    });

    it('should return 503 when the fullnode is not healthy and returns 503', async () => {
      TestUtils.httpMock.onGet('http://fakehost:8083/v1a/health').reply(503, { status: 'fail' });

      const response = await TestUtils.request
        .query({ include_tx_mining: true, include_fullnode: true, wallet_ids: walletId })
        .get('/health');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 503,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentId: 'http://fakehost:8083/v1a/',
              componentType: 'http',
              status: 'fail',
              output: 'Fullnode reported as unhealthy: {"status":"fail"}',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentId: 'http://fake.txmining:8084/',
              componentType: 'http',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
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
        .query({ include_tx_mining: true, include_fullnode: true, wallet_ids: walletId })
        .get('/health');
      expect(response.status).toBe(503);

      expect(response.body).toStrictEqual({
        status: 'fail',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 503,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentId: 'http://fakehost:8083/v1a/',
              componentType: 'http',
              status: 'pass',
              output: 'Fullnode is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentId: 'http://fake.txmining:8084/',
              componentType: 'http',
              status: 'fail',
              output: 'Tx Mining Service reported as unhealthy: {"status":"fail"}',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
        }
      });
    });

    it('should not include the fullnode when the parameter is missing', async () => {
      const response = await TestUtils.request
        .query({ include_tx_mining: true, wallet_ids: walletId })
        .get('/health');
      expect(response.status).toBe(200);

      expect(response.body).toStrictEqual({
        status: 'pass',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 200,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'TxMiningService http://fake.txmining:8084/': [
            {
              componentName: 'TxMiningService http://fake.txmining:8084/',
              componentId: 'http://fake.txmining:8084/',
              componentType: 'http',
              status: 'pass',
              output: 'Tx Mining Service is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
        }
      });
    });

    it('should not include the tx mining service when the parameter is missing', async () => {
      const response = await TestUtils.request
        .query({ include_fullnode: true, wallet_ids: walletId })
        .get('/health');
      expect(response.status).toBe(200);

      expect(response.body).toStrictEqual({
        status: 'pass',
        description: 'Health status of hathor-wallet-headless',
        httpStatusCode: 200,
        checks: {
          'Wallet health_wallet': [
            {
              componentName: 'Wallet health_wallet',
              componentId: 'health_wallet',
              componentType: 'internal',
              status: 'pass',
              output: 'Wallet is ready',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
          'Fullnode http://fakehost:8083/v1a/': [
            {
              componentName: 'Fullnode http://fakehost:8083/v1a/',
              componentId: 'http://fakehost:8083/v1a/',
              componentType: 'http',
              status: 'pass',
              output: 'Fullnode is healthy',
              time: expect.any(String),
              affectsServiceHealth: true,
            },
          ],
        }
      });
    });
  });
});
