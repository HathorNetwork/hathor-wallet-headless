import TestUtils from './test-utils';
import { MAX_DATA_SCRIPT_LENGTH } from '../src/constants';

describe('send-tx api', () => {
  it('should return 200 with a valid body selecting inputs by query', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ type: 'query', filter_address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN' }],
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBeTruthy();
  });

  it('should return 200 with selecting inputs by query with custom tokens', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ type: 'query', filter_address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp' }],
        outputs: [
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 10 },
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 10, token: '04' }
        ],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBeTruthy();
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBeTruthy();
  });

  it('should return 200 with a valid body selecting inputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ hash: '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca', index: 0 }],
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBeTruthy();
  });

  it('should accept value as string', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 },
          { address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN', value: '1' },
        ],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept transactions without address or value', async () => {
    let response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc' }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept transactions with 0 value', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 0 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should receive an error when trying to do concurrent transactions (lock/unlock behavior)', async () => {
    const promise1 = TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    const promise2 = TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);
    expect(response1.status).toBe(200);
    expect(response1.body.hash).toBeTruthy();
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBeFalsy();
  });

  it('should accept a custom token transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
        token: {
          name: 'stub_token',
          uid: '09',
          symbol: 'stub_token',
        },
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
    expect(response.body.success).toBeTruthy();
  });

  it('should accept a custom token transaction (token as string)', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1, token: '09' }]
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept a custom token transaction without funds to cover it', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
        token: {
          name: 'stub_token_2',
          uid: '02',
          symbol: 'stub_token_2',
        },
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept a custom token transaction without funds to cover it (filter query)', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ type: 'query', filter_address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN' }],
        outputs: [
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 },
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1, token: '04' }
        ],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('No utxos available');
    expect(response.body.token).toBe('04');
  });

  it('should not accept a custom token transaction without funds to cover it (token as string)', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1, token: '02' }]
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should accept a transaction with a change_address that does belong to the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
        change_address: 'Wc5YHn861241iLY42mFT8z1dT1UdsNWkfs',
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept a custom token transaction without all token properties', async () => {
    ['name', 'uid', 'symbol'].forEach(async field => {
      const token = {
        name: 'stub_token',
        uid: '01',
        symbol: 'stub_token',
      };
      delete token[field];
      const response = await TestUtils.request
        .post('/wallet/send-tx')
        .send({
          outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
          token,
        })
        .set({ 'x-wallet-id': TestUtils.walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBeFalsy();
    });
  });

  it('should not accept a transaction with a change_address that does not belong to the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
        change_address: 'WVGxdgZMHkWo2Hdrb1sEFedNdjTXzjvjPg',
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept a transaction incomplete output data', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ type: 'data' }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
  });

  it('should not accept a transaction with both output types: data and p2pkh', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ type: 'data', data: 'test', address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);
  });

  it('should accept a transaction with data output', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ type: 'data', data: 'test' }]
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
    expect(response.body.success).toBeTruthy();
  });

  it('should accept a transaction with data output and p2pkh output', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { type: 'data', data: 'test' },
          { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 }
        ]
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeTruthy();
    expect(response.body.success).toBeTruthy();
  });

  it('should not accept a transaction with data size bigger than the maximum', async () => {
    // Error with MAX + 1
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ type: 'data', data: 'a'.repeat(MAX_DATA_SCRIPT_LENGTH + 1) }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response.status).toBe(400);

    // Success with MAX
    const response2 = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ type: 'data', data: 'a'.repeat(MAX_DATA_SCRIPT_LENGTH) }],
      })
      .set({ 'x-wallet-id': TestUtils.walletId });
    expect(response2.status).toBe(200);
    expect(response2.body.hash).toBeTruthy();
    expect(response2.body.success).toBeTruthy();
  });
});
