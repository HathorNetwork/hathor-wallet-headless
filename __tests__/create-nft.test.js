import TestUtils from './test-utils';
import { MAX_DATA_SCRIPT_LENGTH } from '../src/constants';

const walletId = 'stub_create_nft';

describe('create-nft api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
        data: 'data test',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
    expect(response.body.hash).toBeDefined();
  });

  it('should not create a token without the required parameters', async () => {
    ['name', 'symbol', 'amount', 'data'].forEach(async field => {
      const token = {
        name: 'stub_token',
        symbol: '03',
        amount: 1,
        data: 'data test',
      };
      delete token[field];
      const response = await TestUtils.request
        .post('/wallet/create-nft')
        .send(token)
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBeFalsy();
    });
  });

  it('should not create a token without the required funds to cover it', async () => {
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 10 ** 9,
        data: 'data test',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should receive an error when trying to do concurrent create-token (lock/unlock behavior)', async () => {
    const promise1 = TestUtils.request
      .post('/wallet/create-nft')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
        data: 'data test',
      })
      .set({ 'x-wallet-id': walletId });
    const promise2 = TestUtils.request
      .post('/wallet/create-nft')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
        data: 'data test',
      })
      .set({ 'x-wallet-id': walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);
    expect(response1.status).toBe(200);
    expect(response1.body.hash).toBeTruthy();
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();
  });

  it('should not create an NFT with data size bigger than the max', async () => {
    // Error with MAX + 1
    const response = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
        data: 'a'.repeat(MAX_DATA_SCRIPT_LENGTH + 1),
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);

    // Success with MAX
    const response2 = await TestUtils.request
      .post('/wallet/create-nft')
      .send({
        name: 'stub_token',
        symbol: '03',
        amount: 1,
        data: 'a'.repeat(MAX_DATA_SCRIPT_LENGTH),
      })
      .set({ 'x-wallet-id': walletId });
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeTruthy();
    expect(response2.body.hash).toBeDefined();
  });
});
