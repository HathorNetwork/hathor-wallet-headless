import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;
  const fundTx1 = { hash: null, index: null };

  beforeAll(async () => {
    try {
      wallet1 = new WalletHelper('send-tx-1');
      wallet2 = new WalletHelper('send-tx-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
      const fundTxObj = await wallet1.injectFunds(1000);
      fundTx1.hash = fundTxObj.hash;
      fundTx1.index = TestUtils.getOutputIndexFromTx(fundTxObj, 1000);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  // Starting with all the rejection tests, that do not have side-effects

  // Invalid inputs
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

  it('should reject an invalid filterAddress input', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ type: 'query', filter_address: 'invalidAddress' }],
        outputs: [{ address: await wallet1.getAddressAt(5), value: 10 }],
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

  it('should reject an invalid input', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{
          hash: 'invalidInput',
          index: 0
        }],
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

  // Insuficcient funds
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

  it('should reject for insuficcient funds on queryAddress', async done => {
    // Wallet1 has enough funds, but none of them are on index 5
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(5) }],
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    done();
  });

  it('should reject for insuficcient funds on input', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [fundTx1],
        outputs: [{ address: await wallet2.getAddressAt(0), value: 1001 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    done();
  });

  // Lastly, testing success cases, which have side-effects

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

  it('should send with only the filterAddress', async done => {
    // Waiting for transactions to settle and spending the 20 HTR tokens above back to wallet1
    await TestUtils.delay(1000);

    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ type: 'query', filter_address: await wallet2.getAddressAt(0) }],
        outputs: [{ address: await wallet1.getAddressAt(0), value: 20 }],
      })
      .set({ 'x-wallet-id': wallet2.walletId });

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

  it('should send with correct input', async done => {
    // Injecting 2000 HTR on wallet2, to ensure the funds would not be available otherwise
    const fundTxObj = await wallet2.injectFunds(2000, 3);
    const fundTx2 = {
      hash: fundTxObj.hash,
      index: TestUtils.getOutputIndexFromTx(fundTxObj, 2000)
    };

    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [fundTx2],
        outputs: [{ address: await wallet1.getAddressAt(4), value: 1100 }],
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();
    expect(response.body.success).toBe(true);

    const addr3 = await wallet2.getAddressInfo(3);
    expect(addr3.total_amount_received).toBe(2000);
    expect(addr3.total_amount_sent).toBe(2000);

    const addr4 = await wallet1.getAddressInfo(4);
    expect(addr4.total_amount_received).toBe(1100);

    done();
  });
});

/*
Change address with zero change
Validation of the change address

Send a transaction with two inputs - one invalid source
Send a transaction with two inputs - sources without combined balance
Send a transaction with two inputs - success

Send a transaction with two outputs - invalid destination
Send a transaction with two outputs - insuficcient balance
Send a transaction with two outputs - success, existing change
Send a transaction with two outputs - success, exact value, no change

Send a transaction with a single custom token ( use the "token" attribute on body )
- Send a transaction with multiple inputs
- Send a transaction with multiple outputs
- Send a transaction with multiple inputs and outputs

Send a transaction with a single custom token ( use the "token" attribute on "outputs[n]" )
- Send a transaction with multiple inputs
- Send a transaction with multiple outputs
- Send a transaction with multiple inputs and outputs

Send a transaction with multiple tokens (custom + htr)
- Send a transaction with multiple inputs
- Send a transaction with multiple outputs
- Send a transaction with multiple inputs and outputs

 */
