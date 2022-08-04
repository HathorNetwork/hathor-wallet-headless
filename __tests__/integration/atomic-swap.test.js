import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import { singleMultisigWalletData } from '../../scripts/helpers/wallet-precalculation.helper';
import { loggers } from './utils/logger.util';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;
  let walletMultisig;

  let tokenTx1;
  let tokenTx2;

  const {
    words: multisigWords,
    walletConfig: multisigWalletConfig,
  } = singleMultisigWalletData;

  beforeAll(async () => {
    global.config.seeds = { multisig: multisigWords[0] };
    global.config.multisig = { multisig: multisigWalletConfig };
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

      tokenTx1 = await wallet1.createToken({ amount: 100, name: 'Token wallet1', symbol: 'TKW1' });
      tokenTx2 = await wallet2.createToken({ amount: 100, name: 'Token wallet2', symbol: 'TKW2' });

      // Awaiting for updated balances to be received by the websocket
      await TestUtils.pauseForWsUpdate();
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    global.config.seeds = {};
    global.config.multisig = {};
    await wallet1.stop();
    await wallet2.stop();
    await walletMultisig.stop();
  });

  it('should exchange HTR between 2 wallets', async () => {
    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({ send_tokens: [{ value: 10 }] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: proposal', { body: response.body });

    let { data } = response.body;

    expect(response.body.isComplete).toBe(false);

    // wallet2 updates the proposal
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({ partial_tx: data, receive_tokens: [{ value: 10 }] })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: update proposal', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // wallet1: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: get signatures', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      isComplete: true,
      signatures: expect.any(String),
    });
    const signature = response.body.signatures;

    // wallet2: sign-and-push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signature] })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[HTR P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();
  });

  it('should exchange custom tokens between 2 wallets', async () => {
    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({ send_tokens: [{ token: tokenTx1.hash, value: 10 }] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: proposal', { body: response.body });

    let { data } = response.body;

    expect(response.body.isComplete).toBe(false);

    // wallet2 updates the proposal
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({ partial_tx: data, receive_tokens: [{ token: tokenTx1.hash, value: 10 }] })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: update proposal', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // wallet2: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: get signatures', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      isComplete: false,
      signatures: expect.any(String),
    });
    const signature = response.body.signatures;

    // wallet1: sign-and-push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signature] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[1TK P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();
  });

  it('should exchange multiple tokens between 2 wallets', async () => {
    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ token: tokenTx1.hash, value: 5 }, { token: '00', value: 10 }],
        receive_tokens: [{ token: tokenTx2.hash, value: 15 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: proposal', { body: response.body });

    let { data } = response.body;

    expect(response.body.isComplete).toBe(false);

    // wallet2 updates the proposal
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive_tokens: [{ token: tokenTx1.hash, value: 5 }, { value: 10 }],
        send_tokens: [{ token: tokenTx2.hash, value: 15 }],
      })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: update proposal', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // wallet1: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: get signatures', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      isComplete: false,
      signatures: expect.any(String),
    });
    const signature = response.body.signatures;

    // wallet2: sign-and-push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signature] })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();
  });

  it('should allow multisig wallets to participate', async () => {
    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ value: 200 }], // HTR
        receive_tokens: [
          { token: tokenTx2.hash, value: 50 },
          { token: tokenTx1.hash, value: 50 },
        ],
      })
      .set({ 'x-wallet-id': walletMultisig.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: proposal', { body: response.body });
    expect(response.body.isComplete).toBe(false);

    let { data } = response.body;

    // wallet1 updates the proposal
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive_tokens: [{ value: 60 }],
        send_tokens: [{ token: tokenTx1.hash, value: 50 }],
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: update proposal 1', { body: response.body });
    expect(response.body.isComplete).toBe(false);

    data = response.body.data;

    // wallet2 updates the proposal
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: data,
        receive_tokens: [{ value: 140 }],
        send_tokens: [{ token: tokenTx2.hash, value: 50 }],
      })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: update proposal 2', { body: response.body });
    expect(response.body.isComplete).toBe(true);

    data = response.body.data;

    // wallet2: sign data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-my-signatures')
      .send({ partial_tx: data })
      .set({ 'x-wallet-id': wallet2.walletId });
    loggers.test.insertLineToLog('atomic-swap[P2SH]: get signatures p2pkh', { body: response.body });
    expect(response.body).toEqual({
      success: true,
      isComplete: false,
      signatures: expect.any(String),
    });
    const signatureP2PKH = response.body.signatures;

    /* Multisig collect signatures
     * 1. extract txHex from partial tx
     * 2. each participant calls p2sh get-my-signatures
     * 3. one participant calls p2sh sign to generate a txHex with input data
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

    // wallet1: sign-and-push data
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/sign-and-push')
      .send({ partial_tx: data, signatures: [signatureP2PKH, signatureP2SH] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('atomic-swap[2TK P2PKH]: push', { body: response.body });
    expect(response.body.success).toBe(true);

    await TestUtils.pauseForWsUpdate();
  });
});
