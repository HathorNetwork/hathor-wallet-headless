import TestUtils from './test-utils';

const walletId = 'stub_transaction';
const walletIdConfirmation = 'stub_transaction_confirmation_number';

describe('transaction api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.tx_id).toBe(
      '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce'
    );
  });

  it('should not find an invalid transaction', async () => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({
        id: '1',
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing parameter id', async () => {
    const response = await TestUtils.request
      .get('/wallet/transaction')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });
});

describe('transaction blocks confirmation number', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({
      walletId: walletIdConfirmation,
      preCalculatedAddresses: TestUtils.addresses
    });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId: walletIdConfirmation });
  });

  it('should return 200 with a valid body', async () => {
    const response = await TestUtils.request
      .get('/wallet/tx-confirmation-blocks')
      .query({
        id: '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
      })
      .set({ 'x-wallet-id': walletIdConfirmation });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // The expected number 8 comes from the hardcoded fixtures file of API responses
    expect(response.body.confirmationNumber).toBe(8);
  });

  it('should not find an invalid transaction', async () => {
    const response = await TestUtils.request
      .get('/wallet/tx-confirmation-blocks')
      .query({
        id: '1',
      })
      .set({ 'x-wallet-id': walletIdConfirmation });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing parameter id', async () => {
    const response = await TestUtils.request
      .get('/wallet/tx-confirmation-blocks')
      .set({ 'x-wallet-id': walletIdConfirmation });
    expect(response.status).toBe(400);
  });
});
