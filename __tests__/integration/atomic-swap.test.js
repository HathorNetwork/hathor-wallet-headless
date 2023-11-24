import { PartialTx, network } from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import { singleMultisigWalletData } from '../../scripts/helpers/wallet-precalculation.helper';
import { loggers } from './utils/logger.util';
import settings from '../../src/settings';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;
  let walletMultisig;

  let fundsTx;
  let tokenTx1;
  let tokenTx2;

  const {
    words: multisigWords,
    walletConfig: multisigWalletConfig,
  } = singleMultisigWalletData;

  beforeAll(async () => {
    const config = settings.getConfig();
    config.seeds = { multisig: multisigWords[0] };
    config.multisig = { multisig: multisigWalletConfig };
    settings._setConfig(config);
    try {
      wallet1 = WalletHelper.getPrecalculatedWallet('atomic-swap-1');
      wallet2 = WalletHelper.getPrecalculatedWallet('atomic-swap-2');
      walletMultisig = new WalletHelper('multisig', { seedKey: 'multisig', multisig: true });

      await WalletHelper.startMultipleWalletsForTest([
        wallet1,
        wallet2,
        walletMultisig,
      ]);

      // Funds for single input/output tests
      await wallet1.injectFunds(1000, 0);
      await wallet2.injectFunds(1000, 0);
      await walletMultisig.injectFunds(1000, 0);

      tokenTx1 = await wallet1.createToken({ amount: 1000, name: 'Token wallet1', symbol: 'TKW1' });
      loggers.test.insertLineToLog('atomic swap create token for wallet-1', { response: tokenTx1 });
      tokenTx2 = await wallet2.createToken({ amount: 1000, name: 'Token wallet2', symbol: 'TKW2' });

      fundsTx = await wallet1.injectFunds(10, 0);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    const config = settings.getConfig();
    config.seeds = {};
    config.multisig = {};
    settings._setConfig(config);
    await wallet1.stop();
    await wallet2.stop();
    await walletMultisig.stop();
  });

  /* XXX: The first 2 tests MUST be the first and seconds ones to run
   * We use the hash from the injectFunds transaction as an utxo
   * it MUST to be unspent when running these tests.
   */
  it('should lock utxos when adding them to a partial_tx', async () => {
    // wallet1 will add tokens to a proposal
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            { token: '00', value: 100 },
            { token: tokenTx1.hash, value: 5 },
          ],
        },
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[lock]: proposal with lock', { body: response.body });

    let proposal = response.body.data;

    // check that both utxos are locked
    // The transaction should be the tokenTx1 because the fundsTx only has 10 HTR
    // This makes the wallet-lib choose the change from creating TKW1 since it has 990 HTR
    response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/get-locked-utxos')
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[lock]: check with lock', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      locked_utxos: [
        { tx_id: tokenTx1.hash, outputs: [0, 1] }, // HTR + token TKW1
      ],
    });

    // Unlock utxos
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/unlock')
      .send({ partial_tx: proposal })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[lock]: unlock', { body: response.body });
    expect(response.body).toEqual({ success: true });

    // check that both utxos were freed
    response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/get-locked-utxos')
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[lock]: check with lock', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      locked_utxos: [],
    });

    // Will attempt the same request with lock = false
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            { token: '00', value: 100 },
            { token: tokenTx1.hash, value: 5 },
          ],
        },
        lock: false,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[lock]: proposal with lock=false', { body: response.body });

    proposal = response.data;

    // Check that no utxos were locked from the last request
    response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/get-locked-utxos')
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[lock]: check with lock=false', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      locked_utxos: [],
    });
  });

  it('should choose utxos from the allocated pool of utxos', async () => {
    // wallet1 will add HTR and TKW1 to the proposal
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            { token: '00', value: 1 },
            { token: tokenTx1.hash, value: 2 },
          ],
          utxos: [
            { txId: tokenTx1.hash, index: 0 },
            { txId: tokenTx1.hash, index: 1 },
          ],
        },
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[utxos]: proposal', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      data: expect.any(String),
      isComplete: false,
    });

    const proposal = response.body.data;

    // check that the correct utxos are locked
    response = await TestUtils.request
      .get('/wallet/atomic-swap/tx-proposal/get-locked-utxos')
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[utxos]: check', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      locked_utxos: [
        { tx_id: tokenTx1.hash, outputs: [0, 1] },
      ],
    });

    // Unlock utxos
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/unlock')
      .send({ partial_tx: proposal })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[utxos]: unlock', { body: response.body });
    expect(response.body).toEqual({ success: true });

    // Since the wallet-lib shuffles change outputs
    // we need to check which output index is from wallet1
    response = await TestUtils.request
      .get('/wallet/transaction')
      .query({ id: fundsTx.hash })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[utxos]: check fundsTx', { body: response.body });
    expect(response.body.tx_id).toBe(fundsTx.hash);
    expect(response.body.outputs).toBeDefined();

    let fundsIndex;
    let fundsOutput;
    const destAddr = await wallet1.getAddressAt(0);
    for (const [index, output] of Object.entries(response.body.outputs)) {
      if (output.decoded.address === destAddr) {
        fundsIndex = +index; // convert to number
        fundsOutput = output;
        break;
      }
    }
    loggers.test.insertLineToLog('atomic-swap[utxos]: funds utxo', { index: fundsIndex, output: fundsOutput });
    expect(typeof fundsIndex).toBe('number');
    expect(fundsOutput).toMatchObject({
      token: '00',
      value: 10,
      decoded: expect.objectContaining({
        address: destAddr,
      }),
    });

    // Will attempt to send 1 HTR over the available from fundsTx
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            // require more than what's available
            { token: fundsOutput.token, value: fundsOutput.value + 1 },
          ],
          utxos: [
            { txId: fundsTx.hash, index: fundsIndex },
          ],
        },
        lock: false,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[utxos]: proposal with insufficient tokens', { body: response.body });
    expect(response.body).toMatchObject({
      success: false,
      error: 'Don\'t have enough utxos to fill total amount.',
    });
  });

  it('should exchange HTR between 2 wallets', async () => {
    // Get the balance state before the swap
    const startBalance1 = await wallet1.getBalance();
    const startBalance2 = await wallet2.getBalance();

    // wallet1 proposes the transaction
    // wallet1 will send 10 HTR
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({ send: {
        tokens: [{ value: 10 }],
      } })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: proposal', { body: response.body });

    let { data } = response.body;

    expect(response.body.isComplete).toBe(false);

    // wallet2 updates the proposal
    // wallet2 will receive 10 HTR
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive: {
          tokens: [{ value: 10 }],
        }
      })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: update proposal', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // wallet1: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: get signatures1', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureWallet1 = response.body.signatures;

    // wallet2: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: get signatures2', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureWallet2 = response.body.signatures;

    // wallet2: build and push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signatureWallet1, signatureWallet2] })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response.body.hash);

    // Get the balance state after the swap
    const finalBalance1 = await wallet1.getBalance();
    const finalBalance2 = await wallet2.getBalance();

    // Expect both balances to be changed by 10
    expect(finalBalance1.available - startBalance1.available).toEqual(-10);
    expect(finalBalance2.available - startBalance2.available).toEqual(10);
  });

  it('should exchange custom tokens between 2 wallets', async () => {
    // Get the balance state before the swap
    const startBalance1 = await wallet1.getBalance(tokenTx1.hash);
    const startBalance2 = await wallet2.getBalance(tokenTx1.hash);

    // wallet1 proposes the transaction
    // wallet1 will send 10 TKW1
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ token: tokenTx1.hash, value: 10 }],
        }
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: proposal', { body: response.body });

    let { data } = response.body;

    expect(response.body.isComplete).toBe(false);

    // wallet2 updates the proposal
    // wallet2 will receive 10 TKW1
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive: {
          tokens: [{ token: tokenTx1.hash, value: 10 }],
        },
      })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: update proposal', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // wallet1: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: get signatures1', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureWallet1 = response.body.signatures;

    // wallet2: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: get signatures2', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureWallet2 = response.body.signatures;

    // wallet1: build and push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signatureWallet1, signatureWallet2] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response.body.hash);

    // Get the balance state after the swap
    const finalBalance1 = await wallet1.getBalance(tokenTx1.hash);
    const finalBalance2 = await wallet2.getBalance(tokenTx1.hash);

    // Expect both balances to be changed by 10
    expect(finalBalance1.available - startBalance1.available).toEqual(-10);
    expect(finalBalance2.available - startBalance2.available).toEqual(10);
  });

  it('should exchange multiple tokens between 2 wallets', async () => {
    // Get the balance state before the swap
    // balances for wallet1 (HTR, token 1 and token 2)
    const startHTRBalance1 = await wallet1.getBalance();
    const startTK1Balance1 = await wallet1.getBalance(tokenTx1.hash);
    const startTK2Balance1 = await wallet1.getBalance(tokenTx2.hash);

    // balances for wallet2 (HTR, token 1 and token 2)
    const startHTRBalance2 = await wallet2.getBalance();
    const startTK1Balance2 = await wallet2.getBalance(tokenTx1.hash);
    const startTK2Balance2 = await wallet2.getBalance(tokenTx2.hash);

    // wallet1 proposes the transaction
    // wallet1 will:
    //  - send 5 TKW1
    //  - send 10 HTR
    //  - receive 15 TKW2
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            { token: tokenTx1.hash, value: 5 },
            { token: '00', value: 10 },
          ],
        },
        receive: {
          tokens: [{ token: tokenTx2.hash, value: 15 }],
        },
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: proposal', { body: response.body });

    let { data } = response.body;

    // Check content with decode API
    let decodeResponse = await TestUtils.request
      .post('/wallet/decode')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: first decode', { body: decodeResponse.body });
    expect(decodeResponse.body).toMatchObject({
      success: true,
      tx: expect.objectContaining({
        tokens: expect.arrayContaining([tokenTx1.hash, tokenTx2.hash]),
        outputs: expect.arrayContaining([
          expect.objectContaining({
            value: 15,
            tokenData: decodeResponse.body.tx.tokens.indexOf(tokenTx2.hash) + 1,
            decoded: expect.objectContaining({ address: expect.toBeInArray(wallet1.addresses) }),
          }),
        ]),
      }),
    });
    decodeResponse.body.tx.inputs.map(input => expect(input).toEqual(expect.objectContaining({
      txId: expect.any(String),
      index: expect.any(Number),
    })));

    expect(response.body.isComplete).toBe(false);

    // wallet2 updates the proposal
    // wallet2 will:
    //  - send 15 TKW2
    //  - receive 5 TKW1
    //  - receive 10 HTR
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive: {
          tokens: [
            { token: tokenTx1.hash, value: 5 },
            { value: 10 }
          ],
        },
        send: {
          tokens: [{ token: tokenTx2.hash, value: 15 }],
        },
      })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: update proposal', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;
    // Check content with decode API
    decodeResponse = await TestUtils.request
      .post('/wallet/decode')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    expect(decodeResponse.body).toMatchObject({
      success: true,
      tx: {
        tokens: expect.arrayContaining([tokenTx1.hash, tokenTx2.hash]),
        outputs: expect.arrayContaining([
          expect.objectContaining({
            value: 5,
            tokenData: decodeResponse.body.tx.tokens.indexOf(tokenTx1.hash) + 1,
            decoded: expect.objectContaining({ address: expect.toBeInArray(wallet2.addresses) }),
          }),
          expect.objectContaining({
            value: 10,
            tokenData: 0,
            decoded: expect.objectContaining({ address: expect.toBeInArray(wallet2.addresses) }),
          }),
        ]),
      },
    });
    decodeResponse.body.tx.inputs.map(input => expect(input).toEqual(expect.objectContaining({
      txId: expect.any(String),
      index: expect.any(Number),
    })));

    // wallet1: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: get signatures1', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureWallet1 = response.body.signatures;

    // wallet2: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: get signatures2', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureWallet2 = response.body.signatures;

    // wallet2: build and push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signatureWallet1, signatureWallet2] })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response.body.hash);

    // Get the balance state after the swap
    // balances for wallet1 (HTR, token 1 and token 2)
    const finalHTRBalance1 = await wallet1.getBalance();
    const finalTK1Balance1 = await wallet1.getBalance(tokenTx1.hash);
    const finalTK2Balance1 = await wallet1.getBalance(tokenTx2.hash);

    // balances for wallet2 (HTR, token 1 and token 2)
    const finalHTRBalance2 = await wallet2.getBalance();
    const finalTK1Balance2 = await wallet2.getBalance(tokenTx1.hash);
    const finalTK2Balance2 = await wallet2.getBalance(tokenTx2.hash);

    // Expect balances to have changed
    // HTR
    expect(finalHTRBalance1.available - startHTRBalance1.available).toEqual(-10);
    expect(finalHTRBalance2.available - startHTRBalance2.available).toEqual(10);

    // Token 1
    expect(finalTK1Balance1.available - startTK1Balance1.available).toEqual(-5);
    expect(finalTK1Balance2.available - startTK1Balance2.available).toEqual(5);

    // Token 2
    expect(finalTK2Balance1.available - startTK2Balance1.available).toEqual(15);
    expect(finalTK2Balance2.available - startTK2Balance2.available).toEqual(-15);
  });

  it('should allow multisig wallets to participate', async () => {
    // Get the balance state before the swap
    // balances for wallet1 (HTR, token 1 and token 2)
    const startHTRBalance1 = await wallet1.getBalance();
    const startTK1Balance1 = await wallet1.getBalance(tokenTx1.hash);
    const startTK2Balance1 = await wallet1.getBalance(tokenTx2.hash);

    // balances for wallet2 (HTR, token 1 and token 2)
    const startHTRBalance2 = await wallet2.getBalance();
    const startTK1Balance2 = await wallet2.getBalance(tokenTx1.hash);
    const startTK2Balance2 = await wallet2.getBalance(tokenTx2.hash);

    // balances for walletMultisig (HTR, token 1 and token 2)
    const startHTRBalanceMs = await walletMultisig.getBalance();
    const startTK1BalanceMs = await walletMultisig.getBalance(tokenTx1.hash);
    const startTK2BalanceMs = await walletMultisig.getBalance(tokenTx2.hash);

    // walletMultisig proposes the transaction
    // walletMultisig will:
    //  - send 200 HTR
    //  - receive 50 TKW1
    //  - receive 50 TKW2
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ value: 200 }], // HTR
        },
        receive: {
          tokens: [
            { token: tokenTx2.hash, value: 50 },
            { token: tokenTx1.hash, value: 50 },
          ],
        },
      })
      .set({ 'x-wallet-id': walletMultisig.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: proposal', { body: response.body });
    expect(response.body.isComplete).toBe(false);

    let { data } = response.body;

    // wallet1 updates the proposal
    // wallet1 will:
    //  - receive 60 HTR
    //  - send 50 TKW1
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive: {
          tokens: [{ value: 60 }],
        },
        send: {
          tokens: [{ token: tokenTx1.hash, value: 50 }],
        },
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: update proposal 1', { body: response.body });
    expect(response.body.isComplete).toBe(false);

    data = response.body.data;

    // wallet2 updates the proposal
    // wallet2 will:
    //  - receive 140 HTR
    //  - send 50 TKW1
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive: {
          tokens: [{ value: 140 }],
        },
        send: {
          tokens: [{ token: tokenTx2.hash, value: 50 }],
        },
      })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: update proposal 2', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // Check content with decode API
    const decodeResponse = await TestUtils.request
      .post('/wallet/decode')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: decode', { body: decodeResponse.body });
    // Populate multisig wallet helper cache of addresses.
    for (let i = 0; i < 10; i++) {
      await walletMultisig.getAddressAt(i);
    }
    expect(decodeResponse.body).toMatchObject({
      success: true,
      tx: expect.objectContaining({
        tokens: expect.arrayContaining([tokenTx1.hash, tokenTx2.hash]),
        outputs: expect.arrayContaining([
          expect.objectContaining({ // 50 TKW1 to multisig
            value: 50,
            tokenData: decodeResponse.body.tx.tokens.indexOf(tokenTx1.hash) + 1,
            decoded: expect.objectContaining({
              address: expect.toBeInArray(walletMultisig.addresses),
            }),
          }),
          expect.objectContaining({ // 50 TKW2 to multisig
            value: 50,
            tokenData: decodeResponse.body.tx.tokens.indexOf(tokenTx2.hash) + 1,
            decoded: expect.objectContaining({
              address: expect.toBeInArray(walletMultisig.addresses),
            }),
          }),
          expect.objectContaining({ // 60 HTR to wallet1
            value: 60,
            tokenData: 0,
            decoded: expect.objectContaining({ address: expect.toBeInArray(wallet1.addresses) }),
          }),
          expect.objectContaining({ // 140 HTR to wallet2
            value: 140,
            tokenData: 0,
            decoded: expect.objectContaining({ address: expect.toBeInArray(wallet2.addresses) }),
          }),
        ]),
      }),
    });

    // wallet1: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: get signatures p2pkh 1', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureP2PKH1 = response.body.signatures;

    // wallet2: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: get signatures p2pkh 2', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });
    const signatureP2PKH2 = response.body.signatures;

    /* Multisig collect signatures
     * 1. extract txHex from partial tx
     * 2. each participant calls /wallet/p2sh/tx-proposal/get-my-signatures
     * 3. one participant calls /wallet/p2sh/tx-proposal/sign to generate a txHex with input data
     * 4. call atomic-swap get-input-data to extract input data into atomic-swap compliant
     * 5. Use signature from last step as a common atomic-swap signature
     */
    let txHex = data.split('|')[1];
    const sig = await walletMultisig.getSignatures(txHex);

    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign')
      .send({ txHex, signatures: [sig] })
      .set({ 'x-wallet-id': walletMultisig.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: p2sh sign tx', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      txHex: expect.any(String),
    });

    txHex = response.body.txHex;

    // Extract atomic-swap signatures from p2sh signed txHex
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-input-data')
      .send({ txHex })
      .set({ 'x-wallet-id': walletMultisig.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: get input data', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });

    const signatureP2SH = response.body.signatures;

    // wallet1: build and push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signatureP2PKH1, signatureP2PKH2, signatureP2SH] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
    await TestUtils.waitForTxReceived(wallet2.walletId, response.body.hash);

    // Get the balance state after the swap
    // balances for wallet1 (HTR, token 1 and token 2)
    const finalHTRBalance1 = await wallet1.getBalance();
    const finalTK1Balance1 = await wallet1.getBalance(tokenTx1.hash);
    const finalTK2Balance1 = await wallet1.getBalance(tokenTx2.hash);

    // balances for wallet2 (HTR, token 1 and token 2)
    const finalHTRBalance2 = await wallet2.getBalance();
    const finalTK1Balance2 = await wallet2.getBalance(tokenTx1.hash);
    const finalTK2Balance2 = await wallet2.getBalance(tokenTx2.hash);

    // balances for walletMultisig (HTR, token 1 and token 2)
    const finalHTRBalanceMs = await walletMultisig.getBalance();
    const finalTK1BalanceMs = await walletMultisig.getBalance(tokenTx1.hash);
    const finalTK2BalanceMs = await walletMultisig.getBalance(tokenTx2.hash);

    // Expect balances to have changed
    // HTR
    expect(finalHTRBalance1.available - startHTRBalance1.available).toEqual(60);
    expect(finalHTRBalance2.available - startHTRBalance2.available).toEqual(140);
    expect(finalHTRBalanceMs.available - startHTRBalanceMs.available).toEqual(-200);

    // Token 1
    expect(finalTK1Balance1.available - startTK1Balance1.available).toEqual(-50);
    expect(finalTK1Balance2.available - startTK1Balance2.available).toEqual(0);
    expect(finalTK1BalanceMs.available - startTK1BalanceMs.available).toEqual(50);

    // Token 2
    expect(finalTK2Balance1.available - startTK2Balance1.available).toEqual(0);
    expect(finalTK2Balance2.available - startTK2Balance2.available).toEqual(-50);
    expect(finalTK2BalanceMs.available - startTK2BalanceMs.available).toEqual(50);
  });

  it('should send the change to the correct address', async () => {
    const tx = await wallet1.injectFunds(3, 10);
    const destAddr = await wallet1.getAddressAt(10);
    const changeAddr = await wallet1.getAddressAt(11);
    const recvAddr = await wallet1.getAddressAt(12);
    let fundsIndex;
    let fundsOutput;

    // Since the wallet-lib shuffles change outputs
    // we need to find out which output index is from wallet1
    let response = await TestUtils.request
      .get('/wallet/transaction')
      .query({ id: tx.hash })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[change]: check fundsTx', { body: response.body });
    expect(response.body.tx_id).toBe(tx.hash);

    for (const [index, output] of Object.entries(response.body.outputs)) {
      if (output.decoded.address === destAddr) {
        fundsIndex = +index; // convert to number
        fundsOutput = output;
        break;
      }
    }
    loggers.test.insertLineToLog('atomic-swap[change]: funds utxo', { index: fundsIndex, output: fundsOutput });
    expect(typeof fundsIndex).toBe('number');
    expect(fundsOutput).toMatchObject({
      token: '00',
      value: expect.any(Number),
      decoded: expect.objectContaining({
        address: destAddr,
      }),
    });

    // Send 1 HTR and creating 2 HTR of change

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ value: 1 }],
          utxos: [{ txId: tx.hash, index: fundsIndex }],
        },
        change_address: changeAddr,
        lock: false,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[change]: proposal send change', { body: response.body });

    let partialTx = PartialTx.deserialize(response.body.data, network);
    // Prepare outputs to be checked
    for (const output of partialTx.outputs) {
      output.parseScript(network);
    }

    expect(partialTx).toMatchObject({
      inputs: [expect.objectContaining({ // only 1 input
        hash: tx.hash,
        index: fundsIndex,
      })],
      outputs: [expect.objectContaining({ // only 1 output
        isChange: true,
        token: '00',
        value: 2,
        authorities: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: changeAddr }),
        }),
      })],
    });

    // Send 1 HTR and creating 2 HTR of change
    // without selecting the change address

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ value: 1 }],
          utxos: [{ txId: tx.hash, index: fundsIndex }],
        },
        lock: false,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog(
      'atomic-swap[change]: proposal send change without addr',
      { body: response.body },
    );

    partialTx = PartialTx.deserialize(response.body.data, network);
    // Prepare outputs to be checked
    for (const output of partialTx.outputs) {
      output.parseScript(network);
    }

    expect(partialTx).toMatchObject({
      inputs: [expect.objectContaining({ // only 1 input
        hash: tx.hash,
        index: fundsIndex,
      })],
      outputs: [expect.objectContaining({ // only 1 output
        isChange: true,
        token: '00',
        value: 2,
        authorities: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({
            base58: expect.toBeInArray(wallet1.addresses),
          }),
        }),
      })],
    });

    // Receive HTR specifying the address

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive: {
          tokens: [{ value: 4, address: recvAddr }],
        },
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[change]: proposal receive change', { body: response.body });

    partialTx = PartialTx.deserialize(response.body.data, network);
    // Prepare outputs to be checked
    for (const output of partialTx.outputs) {
      output.parseScript(network);
    }
    expect(partialTx).toMatchObject({
      outputs: [expect.objectContaining({
        isChange: false,
        token: '00',
        value: 4,
        authorities: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: recvAddr }),
        }),
      })],
    });
  });
});
