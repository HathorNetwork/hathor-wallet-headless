import { HathorWallet } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const { initializedWallets } = require('../src/services/wallets.service');

const walletId = 'stub_status';

describe('healthcheck api', () => {
  afterEach(async () => {
    await TestUtils.stopMocks();
    TestUtils.startMocks();
  });

  describe('/health', () => {
    it('should return 200 when all components are healthy', async () => {
      await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });

      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        200,
        { status: 'pass' }
      );

      const response = await TestUtils.request
        .get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('pass');
      expect(response.body.description).toBe('Wallet-headless health');

      expect(response.body.checks['Wallet stub_status'][0].componentName).toBe('Wallet stub_status');
      expect(response.body.checks['Wallet stub_status'][0].componentType).toBe('internal');
      expect(response.body.checks['Wallet stub_status'][0].status).toBe('pass');
      expect(response.body.checks['Wallet stub_status'][0].output).toBe('Wallet is ready');

      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentType).toBe('fullnode');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].status).toBe('pass');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].output).toBe('Fullnode is responding');

      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentType).toBe('service');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].status).toBe('pass');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].output).toBe('Tx Mining Service is healthy');

      await TestUtils.stopWallet({ walletId });
    });

    it('should return 503 when the wallet is not ready', async () => {
      await TestUtils.startWallet({ walletId });

      const wallet = initializedWallets.get(walletId);
      wallet.isReady = () => false;
      wallet.state = HathorWallet.SYNCING;

      const response = await TestUtils.request
        .get('/health');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.description).toBe('Wallet-headless health');

      expect(response.body.checks['Wallet stub_status'][0].componentName).toBe('Wallet stub_status');
      expect(response.body.checks['Wallet stub_status'][0].componentType).toBe('internal');
      expect(response.body.checks['Wallet stub_status'][0].status).toBe('fail');
      expect(response.body.checks['Wallet stub_status'][0].output).toBe('Wallet is not ready. Current state: Syncing');

      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentType).toBe('fullnode');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].status).toBe('pass');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].output).toBe('Fullnode is responding');

      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentType).toBe('service');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].status).toBe('pass');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].output).toBe('Tx Mining Service is healthy');

      await TestUtils.stopWallet({ walletId });
    });

    it('should return 503 when the fullnode is not healthy', async () => {
      await TestUtils.startWallet({ walletId });

      TestUtils.httpMock.onGet('/version').reply(503, { status: 'fail' });

      const response = await TestUtils.request
        .get('/health');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.description).toBe('Wallet-headless health');

      expect(response.body.checks['Wallet stub_status'][0].componentName).toBe('Wallet stub_status');
      expect(response.body.checks['Wallet stub_status'][0].componentType).toBe('internal');
      expect(response.body.checks['Wallet stub_status'][0].status).toBe('pass');
      expect(response.body.checks['Wallet stub_status'][0].output).toBe('Wallet is ready');

      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentType).toBe('fullnode');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].status).toBe('fail');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].output).toBe('Fullnode reported as unhealthy: {"status":"fail"}');

      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentType).toBe('service');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].status).toBe('pass');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].output).toBe('Tx Mining Service is healthy');

      await TestUtils.stopWallet({ walletId });
    });

    it('should return 503 when the tx mining service is not healthy', async () => {
      await TestUtils.startWallet({ walletId });

      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        503,
        { status: 'fail' }
      );

      const response = await TestUtils.request
        .get('/health');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.description).toBe('Wallet-headless health');

      expect(response.body.checks['Wallet stub_status'][0].componentName).toBe('Wallet stub_status');
      expect(response.body.checks['Wallet stub_status'][0].componentType).toBe('internal');
      expect(response.body.checks['Wallet stub_status'][0].status).toBe('pass');
      expect(response.body.checks['Wallet stub_status'][0].output).toBe('Wallet is ready');

      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].componentType).toBe('fullnode');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].status).toBe('pass');
      expect(response.body.checks['Fullnode http://fakehost:8083/v1a/'][0].output).toBe('Fullnode is responding');

      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].componentType).toBe('service');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].status).toBe('fail');
      expect(response.body.checks['TxMiningService http://fake.txmining:8084/'][0].output).toBe('Tx Mining Service reported as unhealthy: {"status":"fail"}');

      await TestUtils.stopWallet({ walletId });
    });
  });

  describe('/health/wallet', () => {
    it('should return 400 when the wallet has not been started', async () => {
      const response = await TestUtils.request
        .get('/health/wallet')
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid wallet id parameter.');
    });

    it('should return 400 when the wallet has been started, but the header was not passed', async () => {
      await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });

      const response = await TestUtils.request
        .get('/health/wallet');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Header \'X-Wallet-Id\' is required.');

      await TestUtils.stopWallet({ walletId });
    });

    it('should return 503 when the wallet is not ready', async () => {
      await TestUtils.startWallet({ walletId });

      const wallet = initializedWallets.get(walletId);
      wallet.isReady = () => false;
      wallet.state = HathorWallet.SYNCING;

      const response = await TestUtils.request
        .get('/health/wallet')
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(503);

      await TestUtils.stopWallet({ walletId });
    });
  });

  describe('/health/fullnode', () => {
    it('should return 503 when the request to the fullnode fails', async () => {
      TestUtils.httpMock.onGet('/version').networkError();

      const response = await TestUtils.request
        .get('/health/fullnode');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.output).toBe('Error getting fullnode health: Network Error');
      expect(response.body.componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.componentType).toBe('fullnode');
    });

    it('should return 503 when the fullnode reports as unhealthy', async () => {
      TestUtils.httpMock.onGet('/version').reply(503, { status: 'fail' });

      const response = await TestUtils.request
        .get('/health/fullnode');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.output).toBe('Fullnode reported as unhealthy: {"status":"fail"}');
      expect(response.body.componentName).toBe('Fullnode http://fakehost:8083/v1a/');
      expect(response.body.componentType).toBe('fullnode');
    });

    it('should return 200 when the fullnode is ready', async () => {
      const response = await TestUtils.request
        .get('/health/fullnode');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('pass');
      expect(response.body.output).toBe('Fullnode is responding');
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
      expect(response.body.status).toBe('fail');
      expect(response.body.output).toBe('Tx Mining Service reported as unhealthy: {"status":"fail"}');
      expect(response.body.componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.componentType).toBe('service');
    });

    it('should return 503 when the request to the tx mining service fails', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').networkErrorOnce();

      const response = await TestUtils.request
        .get('/health/tx-mining');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('fail');
      expect(response.body.output).toBe('Tx Mining Service reported as unhealthy: {"status":"fail"}');
      expect(response.body.componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.componentType).toBe('service');
    });

    it('should return 200 when the tx mining service is healthy', async () => {
      TestUtils.httpMock.onGet('http://fake.txmining:8084/health').reply(
        200,
        { status: 'pass' }
      );

      const response = await TestUtils.request
        .get('/health/tx-mining');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('pass');
      expect(response.body.output).toBe('Tx Mining Service is healthy');
      expect(response.body.componentName).toBe('TxMiningService http://fake.txmining:8084/');
      expect(response.body.componentType).toBe('service');
    });
  });
});
