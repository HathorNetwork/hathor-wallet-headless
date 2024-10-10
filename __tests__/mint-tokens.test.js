import { SendTransaction } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const walletId = 'stub_mint_tokens';

describe('mint-tokens api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it('should create a token with amount as string', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: '1',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it('should not mint a token without the required parameters', async () => {
    ['token', 'amount'].forEach(async field => {
      const token = {
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
      };
      delete token[field];
      const response = await TestUtils.request
        .post('/wallet/mint-tokens')
        .send(token)
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  it('should receive an error when trying to do concurrent mint-tokens (lock/unlock behavior)', async () => {
    const spy = jest.spyOn(SendTransaction.prototype, 'updateOutputSelected').mockImplementation(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 1000);
      });
    });
    try {
      const promise1 = TestUtils.request
        .post('/wallet/mint-tokens')
        .send({
          token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
          amount: 1,
        })
        .set({ 'x-wallet-id': walletId });
      const promise2 = TestUtils.request
        .post('/wallet/mint-tokens')
        .send({
          token: '03',
          amount: 1,
        })
        .set({ 'x-wallet-id': walletId });

      const [response1, response2] = await Promise.all([promise1, promise2]);
      expect(response1.status).toBe(200);
      expect(response1.body.hash).toBeTruthy();
      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('should return 200 when sending data parameters', async () => {
    const response = await TestUtils.request
      .post('/wallet/mint-tokens')
      .send({
        token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        amount: 1,
        data: ['foobar', 'barfoo'],
        unshift_data: true,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });
});
