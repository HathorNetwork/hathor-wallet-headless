import TestUtils from '../test-utils';

const walletId = 'stub_create';

describe('create api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/create')
      .send({
        blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
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
      .post('/wallet/nano-contracts/create')
      .send({
        blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);

    const response2 = await TestUtils.request
      .post('/wallet/nano-contracts/create')
      .send({
        blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response2.status).toBe(400);

    const response3 = await TestUtils.request
      .post('/wallet/nano-contracts/create')
      .send({
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response3.status).toBe(400);
  });
});
