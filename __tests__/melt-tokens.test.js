import TestUtils from './test-utils';
import wsFixtures from './__fixtures__/ws-fixtures';

const walletId = 'stub_melt_tokens';

// TODO: Add a fixture to melt token 01
describe('melt-tokens api', () => {
  beforeEach(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterEach(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it('should melt a token with amount as string', async () => {
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        amount: '1',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
  });

  it('should not melt a token without the required parameters', async () => {
    ['token', 'amount'].forEach(async field => {
      const token = {
        token:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        amount: 1,
      };
      delete token[field];
      const response = await TestUtils.request
        .post('/wallet/melt-tokens')
        .send(token)
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  it('should not melt less than 1 token', async () => {
    const token = {
      token: '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
      amount: 0,
    };
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send(token)
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not melt less than 1 token', async () => {
    const token = {
      token: '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
      amount: 0,
    };
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send(token)
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should not melt more tokens than total amount', async () => {
    const token = {
      token: '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
      amount: 101,
    };
    const response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send(token)
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should melt all tokens and return HTR as change', async () => {
    const token = {
      token: '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
      amount: 100,
    };
    let response = await TestUtils.request
      .post('/wallet/melt-tokens')
      .send(token)
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Mimic the full node wallet:address_history message
    TestUtils.socket.send(JSON.stringify(wsFixtures.melt));
    await new Promise(resolve => {
      setTimeout(resolve, 2000);
    });

    // Check the balance
    response = await TestUtils.request
      .get('/wallet/balance')
      .query({
        token:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.available).toBe(0);
    expect(response.body.locked).toBe(0);
  });

  it('should receive an error when trying to do concurrent melt-tokens (lock/unlock behavior)', async () => {
    const promise1 = TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });
    const promise2 = TestUtils.request
      .post('/wallet/melt-tokens')
      .send({
        token:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        amount: 1,
      })
      .set({ 'x-wallet-id': walletId });

    const [response1, response2] = await Promise.all([promise1, promise2]);
    expect(response1.status).toBe(200);
    expect(response1.body.hash).toBeTruthy();
    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(false);
  });
});
