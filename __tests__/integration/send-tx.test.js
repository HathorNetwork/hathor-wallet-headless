import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('send tx (HTR)', () => {
  let wallet1; // Receives funds
  let wallet2; // Main destination for test transactions
  let wallet3; // For transactions with more than one input

  const fundTx1 = {
    hash: null,
    index: null
  }; // Fund for auto-input transactions
  const fundTx2 = {
    hash: null,
    index: null
  }; // Fund for manual input transactions
  const fundTx3 = {
    hash: null,
    index: null
  }; // Two funds for multi-input transactions
  const fundTx4 = {
    hash: null,
    index: null
  };
  const tx5 = {
    hash: null,
    index: null
  }; // This will be executed on a multiple input test

  beforeAll(async () => {
    try {
      wallet1 = WalletHelper.getPrecalculatedWallet('send-tx-1');
      wallet2 = WalletHelper.getPrecalculatedWallet('send-tx-2');
      wallet3 = WalletHelper.getPrecalculatedWallet('send-tx-3');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2, wallet3]);

      // Funds for single input/output tests
      const fundTxObj1 = await wallet1.injectFunds(1000, 0);
      // Funds for multiple input/output tests
      const fundTxObj2 = await wallet3.injectFunds(1000, 0);
      const fundTxObj3 = await wallet3.injectFunds(1000, 1);
      const fundTxObj4 = await wallet3.injectFunds(1000, 4);

      fundTx1.hash = fundTxObj1.hash;
      fundTx1.index = TestUtils.getOutputIndexFromTx(fundTxObj1, 1000);
      fundTx2.hash = fundTxObj2.hash;
      fundTx2.index = TestUtils.getOutputIndexFromTx(fundTxObj2, 1000);
      fundTx3.hash = fundTxObj3.hash;
      fundTx3.index = TestUtils.getOutputIndexFromTx(fundTxObj3, 1000);
      fundTx4.hash = fundTxObj4.hash;
      fundTx4.index = TestUtils.getOutputIndexFromTx(fundTxObj4, 1000);
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
  it('should reject an invalid address', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: 'invalidAddress',
          value: 10
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject an invalid filterAddress input', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{
          type: 'query',
          filter_address: 'invalidAddress'
        }],
        outputs: [{
          address: await wallet1.getAddressAt(5),
          value: 10
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject an invalid change address', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        change_address: 'invalidAddress',
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address is not from the wallet');
  });

  it('should reject an invalid input', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{
          hash: 'invalidInput',
          index: 0
        }],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        change_address: 'invalidAddress',
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('invalid');
  });

  it('should reject an invalid input, even with a correct one', async () => {
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
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        change_address: 'invalidAddress',
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('invalid');
  });

  it('should reject a change address that does not belong to the wallet', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        change_address: await wallet2.getAddressAt(1),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Change address is not from the wallet');
  });

  it('should reject an invalid value', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 'incorrectValue'
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error[0].msg).toContain('Invalid');
  });

  it('should reject zero value', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 0
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Invalid');
    expect(response.text).toContain('value');
  });

  it('should reject a negative value', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: -1
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Invalid');
    expect(response.text).toContain('value');
  });

  // insufficient funds
  it('should reject for insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
      })
      .set({ 'x-wallet-id': wallet2.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject for insufficient funds with two outputs', async () => {
    // Both outputs are below the 1000 HTR available
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          {
            address: await wallet2.getAddressAt(1),
            value: 800
          },
          {
            address: await wallet2.getAddressAt(2),
            value: 800
          },
        ],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject for insufficient funds with two inputs', async () => {
    // Both inputs are have only 2000 HTR
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [fundTx2, fundTx3],
        outputs: [
          {
            address: await wallet2.getAddressAt(1),
            value: 3000
          },
        ],
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject for insufficient funds on queryAddress', async () => {
    // Wallet1 has enough funds, but none of them are on index 5
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{
          type: 'query',
          filter_address: await wallet1.getAddressAt(5)
        }],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject for insufficient funds on input', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [fundTx1],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 1001
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.hash).toBeUndefined();
    expect(response.body.success).toBe(false);
  });

  it('should reject for an invalid input', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [{ hash: fundTx1.hash, index: -1 }],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 500
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);
    expect(response.text).toContain('Invalid');
    expect(response.text).toContain('input');
  });

  // Lastly, testing success cases, which have side-effects

  it('should send with only the output address and value', async () => {
    const tx = await wallet1.sendTx({
      fullObject: {
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
      },
      destinationWallet: wallet2.walletId
    });

    expect(tx.hash).toBeDefined();
    expect(tx.success).toBe(true);

    const destination0 = await wallet2.getAddressInfo(0);
    expect(destination0.total_amount_available).toBe(10);
  });

  it('should send with only the output address and value and change', async () => {
    const tx = await wallet1.sendTx({
      fullObject: {
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        change_address: await wallet1.getAddressAt(0)
      },
      destinationWallet: wallet2.walletId
    });

    expect(tx.hash).toBeDefined();
    expect(tx.success).toBe(true);

    const destination = await wallet2.getAddressInfo(0);
    expect(destination.total_amount_available).toBe(20);

    const changeAddr = await wallet1.getAddressInfo(0);
    const txSummary = TestUtils.getOutputSummaryHtr(tx, 10);
    expect(changeAddr.total_amount_available).toBe(txSummary.change.value);
  });

  it('should send with only the filterAddress', async () => {
    const inputAddrBefore = await wallet2.getAddressInfo(0);
    const destinationAddrBefore = await wallet1.getAddressInfo(0);
    const sourceBeforeTx = inputAddrBefore.total_amount_available;
    const destinationBeforeTx = destinationAddrBefore.total_amount_available;

    const tx = await wallet2.sendTx({
      fullObject: {
        inputs: [{
          type: 'query',
          filter_address: await wallet2.getAddressAt(0)
        }],
        outputs: [{
          address: await wallet1.getAddressAt(0),
          value: 20
        }],
      },
      destinationWallet: wallet1.walletId
    });

    expect(tx.hash).toBeDefined();
    expect(tx.success).toBe(true);

    const inputAddrAfter = await wallet2.getAddressInfo(0);
    const destinationAddrAfter = await wallet1.getAddressInfo(0);
    expect(inputAddrAfter.total_amount_available).toBe(sourceBeforeTx - 20);
    expect(destinationAddrAfter.total_amount_available).toBe(destinationBeforeTx + 20);
  });

  it('should send with two outputs', async () => {
    const destination1Before = await wallet2.getAddressInfo(1);
    const destination2Before = await wallet1.getAddressInfo(2);

    const tx = await wallet1.sendTx({
      fullObject: {
        outputs: [
          {
            address: await wallet2.getAddressAt(1),
            value: 20
          },
          {
            address: await wallet2.getAddressAt(2),
            value: 30
          },
        ],
      },
      destinationWallet: wallet2.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const destination1After = await wallet2.getAddressInfo(1);
    const destination2After = await wallet2.getAddressInfo(2);
    expect(destination1After.total_amount_available)
      .toBe(destination1Before.total_amount_available + 20);
    expect(destination2After.total_amount_available)
      .toBe(destination2Before.total_amount_available + 30);
  });

  it('should send with two inputs', async () => {
    const tx = await wallet3.sendTx({
      fullObject: {
        inputs: [
          fundTx2,
          fundTx3
        ],
        outputs: [
          {
            address: await wallet2.getAddressAt(6),
            value: 1500
          },
        ],
        change_address: await wallet3.getAddressAt(2)
      },
      destinationWallet: wallet2.walletId
    });

    expect(tx.hash).toBeDefined();

    const destination = await wallet2.getAddressInfo(6);
    const changeAddr = await wallet3.getAddressInfo(2);

    expect(destination.total_amount_received).toBe(1500);
    expect(changeAddr.total_amount_received).toBe(500);

    tx5.hash = tx.hash;
    tx5.index = TestUtils.getOutputIndexFromTx(tx, 500);
  });

  it('should send with correct input', async () => {
    // Injecting 2000 HTR on wallet2[3], to ensure the funds would not be available otherwise
    const fundTxObj = await wallet2.injectFunds(2000, 3);
    const fundTxInput = {
      hash: fundTxObj.hash,
      index: TestUtils.getOutputIndexFromTx(fundTxObj, 2000)
    };

    // The change address should be the next available address on wallet2
    const changeAddrHash = await wallet2.getNextAddress();

    const tx = await wallet2.sendTx({
      fullObject: {
        inputs: [fundTxInput],
        outputs: [{
          address: await wallet1.getAddressAt(4),
          value: 1100
        }],
      },
      destinationWallet: wallet1.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const sourceAddress = await wallet2.getAddressInfo(3);
    expect(sourceAddress.total_amount_received).toBe(2000);
    expect(sourceAddress.total_amount_sent).toBe(2000);

    const destination = await wallet1.getAddressInfo(4);
    expect(destination.total_amount_received).toBe(1100);

    const changeAddr = await TestUtils.getAddressInfo(changeAddrHash, wallet2.walletId);
    expect(changeAddr.total_amount_available).toBe(900);
  });

  it('should send with zero change even with change address', async () => {
    // This test depends on the above transaction of 1100 from wallet2[3] to wallet1[4]
    const tx = await wallet2.sendTx({
      fullObject: {
        outputs: [{
          address: await wallet1.getAddressAt(4),
          value: 900
        }],
        change_address: await wallet2.getAddressAt(5)
      },
      destinationWallet: wallet1.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const addr5 = await wallet2.getAddressInfo(5);
    expect(addr5.total_amount_received).toBe(0);
  });

  it('should send with two inputs and two outputs', async () => {
    const tx = await wallet3.sendTx({
      fullObject: {
        inputs: [
          fundTx4,
          tx5
        ],
        outputs: [
          {
            address: await wallet2.getAddressAt(10),
            value: 760
          },
          {
            address: await wallet2.getAddressAt(11),
            value: 740
          },
        ],
      },
      destinationWallet: wallet2.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const addr7 = await wallet2.getAddressInfo(10);
    expect(addr7.total_amount_received).toBe(760);

    const addr8 = await wallet2.getAddressInfo(11);
    expect(addr8.total_amount_received).toBe(740);
  });

  it(
    'should confirm that, if not informed, the change address is the next empty one',
    async () => {
      const nextAddressHash = await wallet1.getNextAddress();

      const tx = await wallet1.sendTx({
        fullObject: {
          inputs: [{ type: 'query', address: await wallet1.getAddressAt(4) }],
          outputs: [{ address: await wallet2.getAddressAt(5), value: 100 }]
        },
        destinationWallet: wallet2.walletId
      });

      const txSummary = TestUtils.getOutputSummaryHtr(tx, 100);

      const destination = await wallet2.getAddressInfo(5);
      const changeAddr = await TestUtils.getAddressInfo(nextAddressHash, wallet1.walletId);
      expect(destination.total_amount_available).toBe(100);
      expect(changeAddr.total_amount_available).toBe(txSummary.change.value);
    }
  );

  it('should send with timelock', async () => {
    const addr0Info1 = await wallet1.getAddressInfo(0);
    expect(addr0Info1.total_amount_locked).toBe(0);

    const timelock = parseInt(Date.now().valueOf() / 1000, 10) + 1000; // timelock of 1,000 seconds
    const tx = await wallet1.sendTx({
      fullObject: {
        outputs: [{
          address: await wallet1.getAddressAt(0),
          value: 100,
          timelock
        }],
      },
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const addr0Info2 = await wallet1.getAddressInfo(0);
    expect(addr0Info2.total_amount_locked).toBe(100);
  });
});

describe('send tx (custom tokens)', () => {
  let wallet1; // Auto-input funds
  let wallet2; // Destination
  let wallet3; // More than one token in the same transaction
  let wallet4; // Tests using token key inside output
  let wallet5;

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
  const tokenWallet4 = {
    uid: null
  };

  const fundTx1 = {
    hash: null,
    index: null
  }; // Auto-input transactions
  const fundTx2 = {
    hash: null,
    index: null
  }; // Token B transactions
  const tkaTx1 = { hash: null }; // Token A transaction to have two inputs

  beforeAll(async () => {
    wallet1 = WalletHelper.getPrecalculatedWallet('custom-tx-1');
    wallet2 = WalletHelper.getPrecalculatedWallet('custom-tx-2');
    wallet3 = WalletHelper.getPrecalculatedWallet('custom-tx-3');
    wallet4 = WalletHelper.getPrecalculatedWallet('custom-tx-4');
    wallet5 = WalletHelper.getPrecalculatedWallet('custom-tx-5');

    await WalletHelper.startMultipleWalletsForTest(
      [wallet1, wallet2, wallet3, wallet4, wallet5]
    );

    // Funds for single input/output tests - 1000 HTR + 2000 custom A
    await wallet1.injectFunds(1020, 0);
    // Funds for multiple token tests - 990 HTR + 1000 custom B
    await wallet3.injectFunds(1000, 0);
    const tokenCreationA = await wallet1.createToken({
      name: tokenA.name,
      symbol: tokenA.symbol,
      amount: 2000,
      address: await wallet1.getAddressAt(0),
      change_address: await wallet1.getAddressAt(0)
    });
    tokenA.uid = tokenCreationA.hash;
    const tokenAtransfer = await wallet1.sendTx({
      outputs: [
        {
          address: await wallet1.getAddressAt(0),
          value: 1000,
          token: tokenA.uid
        },
        {
          address: await wallet1.getAddressAt(1),
          value: 1000,
          token: tokenA.uid
        },
      ],
    });
    tkaTx1.hash = tokenAtransfer.hash;
    fundTx1.hash = tokenCreationA.hash;
    fundTx1.index = TestUtils.getOutputIndexFromTx(tokenCreationA, 1000);

    const tokenCreationB = await wallet3.createToken({
      name: tokenB.name,
      symbol: tokenB.symbol,
      amount: 1000,
      address: await wallet3.getAddressAt(0),
      change_address: await wallet3.getAddressAt(0)
    });
    tokenB.uid = tokenCreationB.hash;
    fundTx2.hash = tokenCreationB.hash;
    fundTx2.index = TestUtils.getOutputIndexFromTx(tokenCreationB, 990);
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
    await wallet3.stop();
    await wallet4.stop();
    await wallet5.stop();
  });

  // Starting with all the rejection tests, that do not have side-effects

  // Invalid inputs
  it('should reject an invalid input hash on body', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        token: {
          name: tokenA.name,
          symbol: tokenA.symbol,
          uid: 'invalidHash'
        }
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  it.skip('should reject an invalid input name on body', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
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
  });

  it('should reject an invalid input on a multi-input request', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          {
            hash: tkaTx1,
            index: 0
          },
          {
            hash: 'invalidInput',
            index: 5
          },
        ],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
        token: tokenA
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  it.skip('should reject an invalid input symbol on body', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 10
        }],
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
  });

  // insufficient funds
  it('should reject a transaction with insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 3000
        }],
        token: tokenA
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  it('should reject a single-input transaction with insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          {
            hash: tkaTx1,
            index: 0
          },
        ],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 1001
        }],
        token: tokenA
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  it('should reject a multi-input transaction with insufficient funds', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          {
            hash: tkaTx1,
            index: 0
          },
          {
            hash: tkaTx1,
            index: 1
          },
        ],
        outputs: [{
          address: await wallet2.getAddressAt(0),
          value: 2001
        }],
        token: tokenA
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  it('should reject a multi-input, multi token transaction with insufficient funds (custom)', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          {
            hash: tokenB.uid,
            index: 0,
          },
          fundTx2,
        ],
        outputs: [
          {
            address: await wallet2.getAddressAt(7),
            value: 1001,
            token: tokenB.uid
          },
          {
            address: await wallet2.getAddressAt(8),
            value: 500
          }
        ],
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  it('should reject a multi-input, multi token transaction with insufficient funds (htr)', async () => {
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        inputs: [
          {
            hash: tokenB.uid,
            index: 0,
          },
          fundTx2,
        ],
        outputs: [
          {
            address: await wallet2.getAddressAt(7),
            value: 500,
            token: tokenB.uid
          },
          {
            address: await wallet2.getAddressAt(8),
            value: 1001
          }
        ],
      })
      .set({ 'x-wallet-id': wallet3.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.hash).toBeUndefined();
  });

  // Success transaction tests

  const tkaTx2 = {
    hash: null,
    index: null
  }; // Change that will remain on wallet1
  it('should send a custom token with a single input (deprecated token api)', async () => {
    const sendOptions = {
      inputs: [{
        hash: tkaTx1.hash,
        index: 0
      }], // Using index 0 of main transaction
      outputs: [{
        address: await wallet2.getAddressAt(0),
        value: 200
      }],
      token: tokenA,
      change_address: await wallet1.getAddressAt(0)
    };
    const tx = await wallet1.sendTx({
      fullObject: sendOptions,
      destinationWallet: wallet2.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();
    tkaTx2.hash = tx.hash;
    tkaTx2.index = TestUtils.getOutputIndexFromTx(tx, 800);

    // Checking wallet balances
    const balance2tka = await wallet2.getBalance(tokenA.uid);
    expect(balance2tka.available).toBe(200);
    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1tka.available).toBe(1800);

    // Checking specific addresses balances
    const destination = await wallet2.getAddressInfo(0, tokenA.uid);
    expect(destination.total_amount_available).toBe(200);
    const change = await wallet1.getAddressInfo(0, tokenA.uid);
    expect(change.total_amount_available).toBe(800);
  });

  it('should send a custom token with a single input', async () => {
    await wallet4.injectFunds(10);
    const w4TokenTx = await wallet4.createToken({
      address: await wallet4.getAddressAt(0),
      change_address: await wallet4.getAddressAt(0),
      symbol: 'TKW4',
      name: 'Token Wallet 4',
      amount: 1000
    });
    const tk4OutputIndex = TestUtils.getOutputIndexFromTx(w4TokenTx, 1000);
    tokenWallet4.uid = w4TokenTx.hash;

    const sendOptions = {
      inputs: [{
        hash: tokenWallet4.uid,
        index: tk4OutputIndex
      }],
      outputs: [{
        address: await wallet5.getAddressAt(0),
        value: 200,
        token: tokenWallet4.uid
      }],
      change_address: await wallet4.getAddressAt(0)
    };
    const tx = await wallet4.sendTx({
      fullObject: sendOptions,
      destinationWallet: wallet5.walletId

    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    // Checking wallet balances
    const balance5tka = await wallet5.getBalance(tokenWallet4.uid);
    expect(balance5tka.available).toBe(200);
    const balance4tka = await wallet4.getBalance(tokenWallet4.uid);
    expect(balance4tka.available).toBe(800);

    // Checking specific addresses balances
    const destination = await wallet5.getAddressInfo(0, tokenWallet4.uid);
    expect(destination.total_amount_available).toBe(200);
    const change = await wallet4.getAddressInfo(0, tokenWallet4.uid);
    expect(change.total_amount_available).toBe(800);
  });

  it('should send a custom token with multiple inputs', async () => {
    const sendOptions = {
      inputs: [
        {
          hash: tkaTx1.hash,
          index: 1
        }, // Using index 1 of main transaction
        tkaTx2 // Change on wallet 1
      ],
      outputs: [{
        address: await wallet2.getAddressAt(0),
        value: 1800
      }],
      token: tokenA,
    };
    const tx = await wallet1.sendTx({
      fullObject: sendOptions,
      destinationWallet: wallet2.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const balance2tka = await wallet2.getBalance(tokenA.uid);
    expect(balance2tka.available).toBe(2000);

    const destination = await wallet2.getAddressInfo(0, tokenA.uid);
    expect(destination.total_amount_available).toBe(2000);

    const balance1tka = await wallet1.getBalance(tokenA.uid);
    expect(balance1tka.available).toBe(0);
  });

  it('should send a custom token (deprecated token api)', async () => {
    // Sending all TokenA back to wallet 1, address 0
    const sendOptions = {
      outputs: [{
        address: await wallet1.getAddressAt(0),
        value: 2000
      }],
      token: tokenA,
    };

    const tx = await wallet2.sendTx({
      fullObject: sendOptions,
      destinationWallet: wallet1.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const destination = await wallet1.getAddressInfo(0, tokenA.uid);
    expect(destination.total_amount_available).toBe(2000);

    const balance2tka = await wallet2.getBalance(tokenA.uid);
    expect(balance2tka.available).toBe(0);
  });

  it('should send a custom token', async () => {
    // Sending all TokenA back to wallet 1, address 0
    const sendOptions = {
      outputs: [{
        address: await wallet4.getAddressAt(0),
        value: 200,
        token: tokenWallet4.uid
      }],
    };

    const tx = await wallet5.sendTx({
      fullObject: sendOptions,
      destinationWallet: wallet4.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    const destination = await wallet4.getAddressInfo(0, tokenWallet4.uid);
    expect(destination.total_amount_available).toBe(1000);

    const balance5tka = await wallet5.getBalance(tokenWallet4.uid);
    expect(balance5tka.available).toBe(0);
  });

  it('should send a custom token with multi inputs and outputs', async () => {
    // Spreading Token A into three output addresses on wallet2
    const spreadTxOptions = {
      outputs: [
        {
          address: await wallet2.getAddressAt(2),
          value: 900
        },
        {
          address: await wallet2.getAddressAt(3),
          value: 800
        },
        {
          address: await wallet2.getAddressAt(4),
          value: 300
        }
      ],
      token: tokenA,
    };
    const spreadTx = await wallet1.sendTx({
      fullObject: spreadTxOptions,
      destinationWallet: wallet2.walletId
    });

    // Consolidating these funds back into wallet1 in two addresses
    const consolidateTxOptions = {
      outputs: [
        {
          address: await wallet1.getAddressAt(3),
          value: 1600
        },
        {
          address: await wallet1.getAddressAt(4),
          value: 400
        }
      ],
      inputs: [
        {
          hash: spreadTx.hash,
          index: 0
        },
        {
          hash: spreadTx.hash,
          index: 1
        },
        {
          hash: spreadTx.hash,
          index: 2
        }
      ],
      token: tokenA
    };
    const consolidateTx = await wallet2.sendTx({
      fullObject: consolidateTxOptions,
      destinationWallet: wallet1.walletId
    });

    expect(consolidateTx.success).toBe(true);
    expect(consolidateTx.hash).toBeDefined();

    const destination3 = await wallet1.getAddressInfo(3, tokenA.uid);
    const destination4 = await wallet1.getAddressInfo(4, tokenA.uid);
    expect(destination3.total_amount_available).toBe(1600);
    expect(destination4.total_amount_available).toBe(400);
  });

  let tkbTx1 = null;
  it('should send a multi-input, multi token transaction', async () => {
    tkbTx1 = await wallet3.sendTx({
      fullObject: {
        inputs: [
          {
            hash: tokenB.uid,
            index: 0,
          },
          {
            hash: tokenB.uid,
            index: 1
          },
        ],
        outputs: [
          {
            address: await wallet3.getAddressAt(7),
            value: 1000,
            token: tokenB.uid
          },
          {
            address: await wallet3.getAddressAt(8),
            value: 990
          }
        ],
      }
    });

    expect(tkbTx1.success).toBe(true);
    expect(tkbTx1.hash).toBeDefined();

    const destination7 = await wallet3.getAddressInfo(7, tokenB.uid);
    const destination8 = await wallet3.getAddressInfo(8);
    expect(destination7.total_amount_available).toBe(1000);
    expect(destination8.total_amount_available).toBe(990);
  });

  it('should send a multi-input/token transaction with change address', async () => {
    const outputIndexTKB = TestUtils.getOutputIndexFromTx(tkbTx1, 1000);

    /* We need to have a deep understanding of the wallet and transaction in order to validate
     * its results. First, let's build a "summary" object to help identify the main data here
     * */
    const txOutputSummary = {
      htr: {
        address: await wallet3.getAddressAt(11),
        value: 200,
        index: null,
        change: null,
        changeAddress: null,
        changeIndex: null
      },
      tkb: {
        address: await wallet3.getAddressAt(10),
        value: 650,
        index: null,
        change: null,
        changeIndex: null,
        changeAddress: null
      }
    };

    // next empty address
    await wallet3.getNextAddress();

    // One manual UXTO with 1000 TKB, and automatic UTXO's for HTR
    const tx = await wallet3.sendTx({
      fullObject: {
        inputs: [
          {
            hash: tkbTx1.hash,
            index: outputIndexTKB, // Input for token B
          },
        ],
        outputs: [
          {
            address: txOutputSummary.tkb.address,
            value: txOutputSummary.tkb.value,
            token: tokenB.uid
          },
          {
            address: txOutputSummary.htr.address,
            value: txOutputSummary.htr.value
          }
        ],
      }
    });

    // Basic validation of success
    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    // Obtaining the fully decoded transaction above from the http endpoint
    const decodedTx = await TestUtils.getDecodedTransaction(tx.hash, wallet3.walletId);

    // Analyzing the decoded output data to identify addresses and values
    for (const index in decodedTx.outputs) {
      const output = decodedTx.outputs[index];

      if (output.token_data === 0) {
        // If token_data === 0 , this is a HTR output
        if (output.value === txOutputSummary.htr.value) {
          txOutputSummary.htr.index = index;
        } else {
          txOutputSummary.htr.changeIndex = index;
          txOutputSummary.htr.change = output.value;
          txOutputSummary.htr.changeAddress = output.decoded.address;
        }
      } else if (output.token_data === 1) {
        // If token_data === 1, this is a custom token (TKB) output
        if (output.value === txOutputSummary.tkb.value) {
          txOutputSummary.tkb.index = index;
        } else {
          txOutputSummary.tkb.changeIndex = index;
          txOutputSummary.tkb.change = output.value;
          txOutputSummary.tkb.changeAddress = output.decoded.address;
        }
      }
    }

    // Validating all the outputs' balances
    const destination10 = await wallet3.getAddressInfo(10, tokenB.uid);
    const destination11 = await wallet3.getAddressInfo(11);
    const changeHtr = await TestUtils.getAddressInfo(
      txOutputSummary.htr.changeAddress,
      wallet3.walletId
    );
    const changeTkb = await TestUtils.getAddressInfo(
      txOutputSummary.tkb.changeAddress,
      wallet3.walletId,
      tokenB.uid
    );
    expect(destination10.total_amount_available).toBe(txOutputSummary.tkb.value);
    expect(destination11.total_amount_available).toBe(txOutputSummary.htr.value);
    expect(changeHtr.total_amount_available).toBe(txOutputSummary.htr.change);
    expect(changeTkb.total_amount_available).toBe(txOutputSummary.tkb.change);
  });
});

describe('filter query + custom tokens', () => {
  let wallet1;
  const bugCoin = {
    name: 'BugCoin',
    symbol: 'BUG',
    uid: null
  };

  beforeAll(async () => {
    wallet1 = WalletHelper.getPrecalculatedWallet('filter-custom-1');

    await WalletHelper.startMultipleWalletsForTest([wallet1]);

    // Inject 10 HTR into wallet1 and invest them all creating the custom token
    await wallet1.injectFunds(10, 0);
    const createTokenTx = await wallet1.createToken({
      name: bugCoin.name,
      symbol: bugCoin.symbol,
      amount: 1000,
      address: await wallet1.getAddressAt(0),
    });
    bugCoin.uid = createTokenTx.hash;

    // Inject 20 HTR on other address to validate that it's not changed by custom token txs
    await wallet1.injectFunds(20, 1);

    /*
     * Status:
     * addr0: 0 HTR, 1000 BUG
     * addr1: 20 HTR
     */
  });

  afterAll(async () => {
    await wallet1.stop();
  });

  it('should reject for insufficient funds (custom)', async () => {
    // Sending all the tokens to facilitate address-info validation
    const txErr = await wallet1.sendTx({
      inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(0) }],
      outputs: [{ token: bugCoin.uid, address: await wallet1.getAddressAt(1), value: 2000 }],
    }).catch(err => err.response);

    expect(txErr.status).toBe(200);
    expect(txErr.body.success).toBe(false);
    expect(txErr.body.error).toContain('No utxos');
  });

  it('should reject for unavailable funds on address', async () => {
    // Address 0 on this same wallet has enough funds, but address 1 hasn't.
    const txErr = await wallet1.sendTx({
      inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(1) }],
      outputs: [{ token: bugCoin.uid, address: await wallet1.getAddressAt(2), value: 100 }],
    }).catch(err => err.response);

    expect(txErr.status).toBe(200);
    expect(txErr.body.success).toBe(false);
    expect(txErr.body.error).toContain('No utxos');
  });

  it('should send the custom token with a query filter by address 0', async () => {
    // Sending all the tokens to facilitate address-info validation
    const tx = await wallet1.sendTx({
      inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(0) }],
      outputs: [{ token: bugCoin.uid, address: await wallet1.getAddressAt(1), value: 1000 }],
      title: 'Sending all 1000 BUG to address 1'
    });
    expect(tx.hash).toBeDefined();

    const addr0htr = await wallet1.getAddressInfo(0);
    const addr0custom = await wallet1.getAddressInfo(0, bugCoin.uid);
    expect(addr0custom.total_amount_received).toBe(1000);
    expect(addr0custom.total_amount_available).toBe(0);
    expect(addr0custom.total_amount_sent).toBe(1000);
    expect(addr0htr.total_amount_available).toBe(0);

    const addr1htr = await wallet1.getAddressInfo(1);
    const addr1custom = await wallet1.getAddressInfo(1, bugCoin.uid);
    expect(addr1custom.total_amount_received).toBe(1000);
    expect(addr1custom.total_amount_available).toBe(1000);
    expect(addr1htr.total_amount_available).toBe(20);

    /*
     * Status:
     * addr0: 0 HTR, 0 BUG
     * addr1: 20 HTR, 1000 BUG
     */
  });

  it('should reject for insufficient funds (htr)', async () => {
    const txErr = await wallet1.sendTx({
      inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(1) }],
      outputs: [
        { address: await wallet1.getAddressAt(2), value: 50 },
        { token: bugCoin.uid, address: await wallet1.getAddressAt(2), value: 900 }
      ],
      title: 'Sending all 1000 BUG to address 1'
    }).catch(err => err.response);

    expect(txErr.status).toBe(200);
    expect(txErr.body.success).toBe(false);
    expect(txErr.body.error).toContain('No utxos');
  });

  it('should send the correct custom token from an address that have both', async () => {
    // Sending 10, which is the available HTR balance, to check if the correct token will be sent
    const tx = await wallet1.sendTx({
      inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(1) }],
      outputs: [{ token: bugCoin.uid, address: await wallet1.getAddressAt(2), value: 10 }],
      change_address: await wallet1.getAddressAt(1),
      title: 'Sending only 10 BUG from address 1 to 2'
    });
    expect(tx.hash).toBeDefined();

    // Checking address 1 for both custom and htr
    const addr1custom = await wallet1.getAddressInfo(1, bugCoin.uid);
    const addr1htr = await wallet1.getAddressInfo(1);

    expect(addr1custom.total_amount_available).toBe(990);

    expect(addr1htr.total_amount_received).toBe(20);
    expect(addr1htr.total_amount_available).toBe(20);
    expect(addr1htr.total_amount_sent).toBe(0);

    // Checking address 2 for both custom and htr
    const addr2custom = await wallet1.getAddressInfo(2, bugCoin.uid);
    const addr2htr = await wallet1.getAddressInfo(2);

    expect(addr2custom.total_amount_received).toBe(10);
    expect(addr2custom.total_amount_available).toBe(10);

    expect(addr2htr.total_amount_received).toBe(0);
    expect(addr2htr.total_amount_available).toBe(0);

    /*
     * Status:
     * addr0: 0 HTR, 0 BUG
     * addr1: 20 HTR, 990 BUG
     * addr2: 0 HTR, 10 BUG
     */
  });

  it('should send both tokens from multiple available utxos', async () => {
    await wallet1.injectFunds(990, 3);
    await wallet1.sendTx({
      outputs: [
        { token: bugCoin.uid, address: await wallet1.getAddressAt(3), value: 1000 },
        { address: await wallet1.getAddressAt(3), value: 10 },
      ],
      change_address: await wallet1.getAddressAt(0),
      title: 'Filling address 3 with 1000 HTR and BUG'
    });
    // Address 3 now has 1000 HTR and 1000 BUG, change of 10 HTR went to address 0

    /*
     * Status:
     * addr0: 10 HTR, 0 BUG
     * addr1: 0 HTR, 0 BUG
     * addr2: 0 HTR, 0 BUG
     * addr3: 1000 HTR, 1000 BUG
     */

    // Sending all of them to address 4
    const tx = await wallet1.sendTx({
      inputs: [{ type: 'query', filter_address: await wallet1.getAddressAt(3) }],
      outputs: [
        { token: bugCoin.uid, address: await wallet1.getAddressAt(4), value: 1000 },
        { address: await wallet1.getAddressAt(4), value: 1000 }
      ],
      title: 'Moving all address 3 funds to address 4'
    });
    expect(tx.hash).toBeDefined();

    // Checking address 4 for both custom and htr
    const addr4custom = await wallet1.getAddressInfo(4, bugCoin.uid);
    expect(addr4custom.total_amount_received).toBe(1000);
    expect(addr4custom.total_amount_available).toBe(1000);

    const addr4htr = await wallet1.getAddressInfo(4);
    expect(addr4htr.total_amount_received).toBe(1000);
    expect(addr4htr.total_amount_available).toBe(1000);

    // Asserting that address 0, with the previous change, was untouched
    const addr0htr = await wallet1.getAddressInfo(0);
    expect(addr0htr.total_amount_available).toBe(10);

    /*
     * Status:
     * addr0: 10 HTR, 0 BUG
     * addr1: 0 HTR, 0 BUG
     * addr2: 0 HTR, 0 BUG
     * addr3: 0 HTR, 0 BUG
     * addr4: 1000 HTR, 1000 BUG
     */
  });

  it('should ensure the sum of tokens happens in multiple UTXOs', async () => {
    /*
     * Status:
     * addr0: 10 HTR, 0 BUG
     * addr4: 1000 HTR, 1000 BUG
     */
    const addr3hash = await wallet1.getAddressAt(3);
    await wallet1.sendTx({
      title: 'Splitting the funds in multiple UTXOs',
      outputs: [
        { token: bugCoin.uid, address: addr3hash, value: 200 },
        { token: bugCoin.uid, address: addr3hash, value: 300 },
        { token: bugCoin.uid, address: addr3hash, value: 500 },
        { address: addr3hash, value: 200 },
        { address: addr3hash, value: 300 },
        { address: addr3hash, value: 500 },
      ]
    });
    /*
     * Status:
     * addr0: 10 HTR, 0 BUG
     * addr3: 200+300+500 HTR, 200+300+500 BUG
     * addr4: 0 HTR, 0 BUG
     */

    // Status: at least 3 UTXO's for bugCoin and 3 for HTR
    const addr5hash = await wallet1.getAddressAt(5);
    await wallet1.sendTx({
      title: 'Moving all splitted add3 funds on splitted addr5 outputs',
      inputs: [{ type: 'query', filter_address: addr3hash }],
      outputs: [
        { token: bugCoin.uid, address: addr5hash, value: 250 },
        { token: bugCoin.uid, address: addr5hash, value: 250 },
        { token: bugCoin.uid, address: addr5hash, value: 400 },
        { token: bugCoin.uid, address: addr5hash, value: 100 },
        { address: addr5hash, value: 50 },
        { address: addr5hash, value: 450 },
        { address: addr5hash, value: 470 },
        { address: addr5hash, value: 30 },
      ]
    });
    /*
     * Status:
     * addr0: 10 HTR, 0 BUG
     * addr3: 0 HTR, 0 BUG
     * addr4: 0 HTR, 0 BUG
     * addr5: 1000 HTR, 1000 BUG
     */

    // Checking address 5 for both custom and htr
    const addr5custom = await wallet1.getAddressInfo(5, bugCoin.uid);
    const addr5htr = await wallet1.getAddressInfo(5);

    expect(addr5custom.total_amount_available).toBe(1000);
    expect(addr5htr.total_amount_available).toBe(1000);

    const addr0htr = await wallet1.getAddressInfo(0);

    // Assert that address 0 with the previous change is not affected
    expect(addr0htr.total_amount_available).toBe(10);
  });

  // Outputs must have address and value or type and data
  it('should reject an invalid output object', async () => {
    // Output with address and without value
    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          address: 'invalidAddress',
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(400);

    // Output with type 'data' but without data
    const response2 = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [{
          type: 'data',
        }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response2.status).toBe(400);
  });
});

describe('transaction with data script output', () => {
  let wallet1; // Receives funds
  let wallet2; // Main destination for test transactions

  beforeAll(async () => {
    try {
      wallet1 = WalletHelper.getPrecalculatedWallet('send-tx-data-output-1');
      wallet2 = WalletHelper.getPrecalculatedWallet('send-tx-data-output-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);

      // Funds
      await wallet1.injectFunds(1000, 0);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should success with an output data script', async () => {
    const tx = await wallet1.sendTx({
      outputs: [{
        type: 'data',
        data: 'test'
      }],
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    // Checking wallet balance
    // the data script created spent 0.01 HTR
    const balance = await wallet1.getBalance();
    expect(balance.available).toBe(999);

    expect(tx.outputs.length).toBe(2);

    // The output value with data script will have value 1 and not necessarily will
    // be the first one. Besides that, we currently have no way of identifying the output type
    const valueCheck = tx.outputs[0].value === 1 || tx.outputs[1].value === 1;
    expect(valueCheck).toBe(true);
  });

  it('should success with two output data scripts and p2pkh output script', async () => {
    const tx = await wallet1.sendTx({
      outputs: [{
        type: 'data',
        data: 'test'
      }, {
        type: 'data',
        data: 'test2'
      }, {
        address: await wallet2.getAddressAt(3),
        value: 100,
      }],
      destinationWallet: wallet2.walletId
    });

    expect(tx.success).toBe(true);
    expect(tx.hash).toBeDefined();

    // Checking wallet balance
    // each data script output created spent 0.01 HTR
    // and we created two of them, so we burned 0.02 HTR
    const balance = await wallet1.getBalance();
    expect(balance.available).toBe(897);
    const balance2 = await wallet2.getBalance();
    expect(balance2.available).toBe(100);

    // Checking specific address balance
    const destination = await wallet2.getAddressInfo(3);
    expect(destination.total_amount_available).toBe(100);
  });
});
