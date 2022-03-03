import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;

  beforeAll(async () => {
    try {
      wallet1 = new WalletHelper('send-tx-1');
      wallet2 = new WalletHelper('send-tx-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
      await wallet1.injectFunds(1000);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  // Starting with all the rejection tests, that do not have side-effects

  it('should reject an invalid address', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: 'invalidAddress', value: 10 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    done();
  });

  it('should reject an invalid change address', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
        change_address: 'invalidAddress',
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('invalid');
    done();
  });

  it('should reject a change address that does not belong to the wallet', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
        change_address: wallet2.getAddressAt(1),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    const errorElement = response.body.error[0];
    expect(errorElement.param).toBe('change_address');
    expect(errorElement.msg).toContain('Invalid');
    done();
  });

  it('should reject an invalid value', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 'incorrectValue' }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error[0].msg).toContain('Invalid');
    done();
  });

  it('should reject zero value', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 0 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.error[0].msg).toContain('Invalid');
    done();
  });

  it('should reject for insuficcient funds', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    done();
  });

  it('should reject for insufficient funds with two outputs', async done => {
    // Both outputs are below the 1000 HTR available
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: await wallet2.getAddressAt(1), value: 800 },
          { address: await wallet2.getAddressAt(2), value: 800 },
        ],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    done();
  });

  // Testing success cases, which have side-effects

  it('should send with only the output address and value', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBe(true);
    done();
  });

  it('should send with only the output address and value and change', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
        change_address: await wallet1.getAddressAt(0)
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBe(true);
    done();
  });

  it('should send with two outputs', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: await wallet2.getAddressAt(1), value: 20 },
          { address: await wallet2.getAddressAt(2), value: 30 },
        ],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();

    const [addr1, addr2] = await Promise.all([
      wallet2.getAddressInfo(1),
      wallet2.getAddressInfo(2),
    ]);
    expect(addr1.total_amount_received).toBe(20);
    expect(addr2.total_amount_received).toBe(30);
    done();
  });
});

/*
Valid and invalid values
Valid and invalid destination address
Sufficient and insufficient balance
With and without change address
Validation of the change address

Send a transaction with a single token ( use the "token" attribute on body )
Send a transaction with a single token ( use the "token" attribute on "outputs[n]" )
Send a transaction with multiple tokens
On each scenario test suite, include the following tests:

Send a transaction with multiple inputs
Send a transaction with multiple outputs
Send a transaction with multiple inputs and outputs

Also, make a separate test passing an object {type: "query", filterAddress: sample_address}
on the inputs array to filter for UTXO's on the specified address.
 */
