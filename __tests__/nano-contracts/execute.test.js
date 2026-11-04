import { HathorWallet } from '@hathor/wallet-lib';
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
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
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
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);

    const response2 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
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
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response4.status).toBe(400);
  });

  it('should forward change_address to the wallet-lib', async () => {
    const spy = jest.spyOn(HathorWallet.prototype, 'createNanoContractTransaction');
    try {
      const response = await TestUtils.request
        .post('/wallet/nano-contracts/execute')
        .send({
          nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
          method: 'bet',
          address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
          data: { args: [1234, '1234'] },
          change_address: TestUtils.addresses[3],
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(spy).toHaveBeenCalledWith(
        'bet',
        'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        expect.anything(),
        expect.objectContaining({ changeAddress: TestUtils.addresses[3] }),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('should fail when change_address does not belong to the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
        change_address: TestUtils.multisigAddresses[0],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Transaction change address must belong to the same wallet.');
  });

  it('should reject change_address together with create_token_options', async () => {
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        method: 'bet',
        address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
        data: { args: [1234, '1234'] },
        change_address: TestUtils.addresses[3],
        create_token_options: {
          name: 'Test token',
          symbol: 'TST',
          amount: 100,
          contract_pays_deposit: false,
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.details).toEqual([
      'change_address is not supported with create_token_options, use create_token_options.change_address instead',
    ]);
  });
});
