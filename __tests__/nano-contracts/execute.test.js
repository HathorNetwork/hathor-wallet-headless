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
        blueprint: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { ncId: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a', args: [{ type: 'int', value: 1234 }, { type: 'byte', value: '1234' }] },
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
        blueprint: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);

    const response2 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        blueprint: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        method: 'bet',
        data: { args: [{ type: 'int', value: 1234 }, { type: 'byte', value: '1234' }] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response2.status).toBe(400);

    const response3 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [{ type: 'int', value: 1234 }, { type: 'byte', value: '1234' }] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response3.status).toBe(400);

    const response4 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        blueprint: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [{ type: 'int', value: 1234 }, { type: 'byte', value: '1234' }] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response4.status).toBe(400);

    const response5 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        blueprint: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [{ type: 'int', value: 1234 }, { type: 'byte', value: '1234' }] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response5.status).toBe(200);
    // This error comes from the lib, that's why we return 200 with success false
    expect(response5.body.success).toBe(false);
  });
});
