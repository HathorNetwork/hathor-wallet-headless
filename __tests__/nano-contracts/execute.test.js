import TestUtils from '../test-utils';

const walletId = 'stub_execute';

describe('execute api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBe(true);
  });

  it('should fail without required parameter', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);

    const response2 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
        method: 'bet',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response2.status).toBe(400);

    const response3 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response3.status).toBe(400);

    const response4 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response4.status).toBe(400);
  });
});
