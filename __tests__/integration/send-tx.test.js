import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('send tx (HTR)', () => {
  let wallet1; // Receives funds
  let wallet2; // Main destination for test transactions
  let wallet3; // For transactions with more than one input

  const fundTx1 = { hash: null, index: null }; // Fund for auto-input transactions
  const fundTx2 = { hash: null, index: null }; // Fund for manual input transactions
  const fundTx3 = { hash: null, index: null }; // Two funds for multi-input transactions
  const fundTx4 = { hash: null, index: null };
  const tx5 = { hash: null, index: null }; // This will be executed on a multiple input test

  beforeAll(async () => {
    try {
      wallet1 = new WalletHelper('send-tx-1');
      wallet2 = new WalletHelper('send-tx-2');
      wallet3 = new WalletHelper('send-tx-3');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2, wallet3]);

      // Funds for single input/output tests
      const fundTxObj1 = await wallet1.injectFunds(1000, 0, { doNotWait: true });
      // Funds for multiple input/output tests
      const fundTxObj2 = await wallet3.injectFunds(1000, 0, { doNotWait: true });
      const fundTxObj3 = await wallet3.injectFunds(1000, 1, { doNotWait: true });
      const fundTxObj4 = await wallet3.injectFunds(1000, 4, { doNotWait: true });

      fundTx1.hash = fundTxObj1.hash;
      fundTx1.index = TestUtils.getOutputIndexFromTx(fundTxObj1, 1000);
      fundTx2.hash = fundTxObj2.hash;
      fundTx2.index = TestUtils.getOutputIndexFromTx(fundTxObj2, 1000);
      fundTx3.hash = fundTxObj3.hash;
      fundTx3.index = TestUtils.getOutputIndexFromTx(fundTxObj3, 1000);
      fundTx4.hash = fundTxObj4.hash;
      fundTx4.index = TestUtils.getOutputIndexFromTx(fundTxObj4, 1000);

      // Awaiting for updated balances to be received by the websocket
      await TestUtils.delay(1000);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
    await wallet3.stop();
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

  it('should reject an invalid input, even with a correct one', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          fundTx1,
          {
            hash: 'invalidInput',
            index: 0
          }
        ],
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

  it('should reject for insufficient funds with two inputs', async done => {
    // Both outputs are below the 1000 HTR available
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [fundTx2, fundTx3],
        outputs: [
          { address: await wallet2.getAddressAt(1), value: 3000 },
        ],
      })
      .set({ 'x-wallet-id': wallet3.walletId });

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

  it('should send with two inputs', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          fundTx2,
          fundTx3
        ],
        outputs: [
          { address: await wallet2.getAddressAt(6), value: 1500 },
        ],
        change_address: await wallet3.getAddressAt(2)
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    const transaction = response.body;
    expect(transaction.hash).toBeDefined();

    const addr6 = await wallet2.getAddressInfo(6);
    const addr2 = await wallet3.getAddressInfo(2);

    expect(addr6.total_amount_received).toBe(1500);
    expect(addr2.total_amount_received).toBe(500);

    tx5.hash = transaction.hash;
    tx5.index = TestUtils.getOutputIndexFromTx(transaction, 500);
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

  it('should send with zero change even with change address', async done => {
    // This test depends on the above transaction of 1100 from wallet2[3] to wallet1[4]
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet1.getAddressAt(4), value: 900 }],
        change_address: await wallet2.getAddressAt(5)
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();

    const addr5 = await wallet2.getAddressInfo(5);
    expect(addr5.total_amount_received).toBe(0);

    done();
  });

  it('should send with two inputs and two outputs', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          fundTx4,
          tx5
        ],
        outputs: [
          { address: await wallet2.getAddressAt(10), value: 760 },
          { address: await wallet2.getAddressAt(11), value: 740 },
        ],
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeDefined();

    const addr7 = await wallet2.getAddressInfo(10);
    expect(addr7.total_amount_received).toBe(760);

    const addr8 = await wallet2.getAddressInfo(11);
    expect(addr8.total_amount_received).toBe(740);
    done();
  });
});

describe('send tx (custom tokens)', () => {
  let wallet1; // Auto-input funds
  let wallet2; // Destination
  let wallet3; // More than one input

  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };
  const tokenB = {
    name: 'Token B',
    symbol: 'TKB',
    uid: null
  };

  const fundTx1 = { hash: null, index: null }; // Auto-input transactions

  beforeAll(async () => {
    wallet1 = new WalletHelper('custom-tx-1');
    wallet2 = new WalletHelper('custom-tx-2');
    wallet3 = new WalletHelper('custom-tx-3');

    await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2, wallet3]);

    // Funds for single input/output tests - 1000 HTR + 1000 custom A and B
    await wallet1.injectFunds(1020, 0, { doNotWait: true });
    const tokenCreationA = await wallet1.createToken({
      name: tokenA.name,
      symbol: tokenA.symbol,
      amount: 1000,
      address: await wallet1.getAddressAt(0),
      change_address: await wallet1.getAddressAt(0)
    });
    tokenA.uid = tokenCreationA.hash;
    const tokenCreationB = await wallet1.createToken({
      name: tokenB.name,
      symbol: tokenB.symbol,
      amount: 1000,
      address: await wallet1.getAddressAt(0),
      change_address: await wallet1.getAddressAt(0)
    });
    tokenB.uid = tokenCreationB.hash;

    fundTx1.hash = tokenCreationB.hash;
    fundTx1.index = TestUtils.getOutputIndexFromTx(tokenCreationB, 1000);

    // Awaiting for balances to be updated via websocket
    await TestUtils.delay(1000);
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
    await wallet3.stop();
  });

  // Starting with all the rejection tests, that do not have side-effects

  // Invalid inputs
  it('should reject an invalid input hash on body', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
        token: {
          name: tokenA.name,
          symbol: tokenA.symbol,
          uid: 'invalidHash'
        }
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
    done();
  });

  it.skip('should reject an invalid input name on body', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
        token: {
          name: 'invalidName',
          symbol: tokenA.symbol,
          uid: tokenA.uid
        }
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Currently ignoring the wrong name. To be fixed later
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
    done();
  });

  it.skip('should reject an invalid input symbol on body', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 10 }],
        token: {
          name: tokenA.name,
          symbol: 'invalidSymbol',
          uid: tokenA.uid
        }
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    // Currently ignoring the wrong symbol. To be fixed later
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
    done();
  });

  // Insuficcient funds
  it('should reject a transaction with insuficcient funds', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 2000 }],
        token: tokenA
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
    done();
  });

  // Success transaction tests
  it('should send a custom token', async done => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{ address: await wallet2.getAddressAt(0), value: 200 }],
        token: tokenA,
        change_address: await wallet1.getAddressAt(0)
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
    done();
  });
});

/*

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
