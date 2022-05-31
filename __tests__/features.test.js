import TestUtils from './test-utils';

const walletId = 'stub_features';

describe('feature lock', () => {
  beforeAll(async () => {
    global.constants.MULTISIG_ENABLED = false;
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    global.constants.MULTISIG_ENABLED = true;
    await TestUtils.stopWallet({ walletId });
  });

  it('[MULTISIG:DISABLED] should not get multisig pubkey', async () => {
    const response = await TestUtils.request
      .post('/multisig-pubkey')
      .send({ seedKey: TestUtils.seedKey });
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
    expect(response.body.message).toEqual(expect.stringContaining('disabled'));
  });

  it('[MULTISIG:DISABLED] should not get multisig signatures', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/get-my-signatures')
      .send({ txHex: '123abc' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
    expect(response.body.message).toEqual(expect.stringContaining('disabled'));
  });

  it('[MULTISIG:DISABLED] should not create signed multisig tx', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/sign')
      .send({ txHex: '123abc', signatures: ['123'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
    expect(response.body.message).toEqual(expect.stringContaining('disabled'));
  });

  it('[MULTISIG:DISABLED] should not send multisig tx', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex: '123abc', signatures: ['123'] })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
    expect(response.body.message).toEqual(expect.stringContaining('disabled'));
  });

  it('[MULTISIG:DISABLED] should not start multisig wallets', async () => {
    // Setup to start a multisig wallet
    global.config.multisig = TestUtils.multisigData;
    // Stop P2PKH wallet started on setupTests
    await TestUtils.stopWallet({ walletId });
    // Start wallet sending multisig as true
    await TestUtils.startWallet({ walletId, multisig: true });

    // Wallet will ignore multisig and start a P2PKH wallet as usual
    const response = await TestUtils.request
      .get('/wallet/address')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.address).toBeDefined();
    expect(response.body.address).toEqual(expect.stringMatching(/^W/));

    // Cleanup
    global.config.multisig = {};
  });
});
