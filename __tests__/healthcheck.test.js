import TestUtils from './test-utils';
const { initializedWallets } = require('../src/services/wallets.service');

const walletId = 'stub_status';

describe('healthcheck api', () => {
  describe('/health/wallet', () => {
    it('should return 400 when the wallet has not been started', async () => {
      const response = await TestUtils.request
        .get('/health/wallet')
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid wallet id parameter.');
    })

    it('should return 400 when the wallet has been started, but the header was not passed', async () => {
      await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });

      const response = await TestUtils.request
        .get('/health/wallet');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Header \'X-Wallet-Id\' is required.');

      await TestUtils.stopWallet({ walletId });
    })

    it('should return 503 when the wallet is not ready', async () => {
      await TestUtils.startWallet({ walletId });

      initializedWallets.get(walletId).isReady = () => false;

      const response = await TestUtils.request
        .get('/health/wallet')
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(503);

      await TestUtils.stopWallet({ walletId });
    })
  });

  describe('/health/fullnode', () => {
    it('should return 503 when the request to the fullnode fails', async () => {
      const response = await TestUtils.request
        .get('/health/fullnode');
      expect(response.status).toBe(503);
    })

    it('should return 503 when the fullnode resports as unhealthy', async () => {
      const response = await TestUtils.request
        .get('/health/fullnode');
      expect(response.status).toBe(503);
    })

    it('should return 200 when the fullnode is ready', async () => {
      const response = await TestUtils.request
        .get('/health/fullnode');
      expect(response.status).toBe(200);
    })
  });

  describe('/health/tx-mining-service', () => {
    it('should return 503 when the request to the tx mining service fails', async () => {
      const response = await TestUtils.request
        .get('/health/tx-mining-service');
      expect(response.status).toBe(503);
    })

    it('should return 503 when the tx mining service resports as unhealthy', async () => {
      const response = await TestUtils.request
        .get('/health/tx-mining-service');
      expect(response.status).toBe(503);
    })

    it('should return 200 when the tx mining service is ready', async () => {
      const response = await TestUtils.request
        .get('/health/tx-mining-service');
      expect(response.status).toBe(200);
    })
  });
});
