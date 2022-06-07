import hathorLib from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import { multisigWalletsData } from '../../scripts/helpers/wallet-precalculation.helper';
import precalculatedMultisig from './configuration/precalculated-multisig-wallets.json';
import { loggers } from './utils/logger.util';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;
  let wallet3;
  let wallet4;
  let wallet5;
  let walletExtra;

  const { words, pubkeys, walletConfig } = multisigWalletsData;

  const fundTx1 = {
    txId: null,
    index: null
  }; // Fund for auto-input transactions

  beforeAll(async () => {
    global.config.seeds = {
      'multisig-1': words[0],
      'multisig-2': words[1],
      'multisig-3': words[2],
      'multisig-4': words[3],
      'multisig-5': words[4],
      'multisig-extra': words[4],
    };
    global.config.multisig = {
      'multisig-1': walletConfig,
      'multisig-2': walletConfig,
      'multisig-3': walletConfig,
      'multisig-4': walletConfig,
      'multisig-5': walletConfig,
      'multisig-extra': {
        pubkeys,
        total: 5,
        numSignatures: 2, // Having a different numSignatures will change the wallet completely
      },
    };
    try {
      wallet1 = new WalletHelper('multisig-1', {
        seedKey: 'multisig-1',
        multisig: true,
        preCalculatedAddresses: precalculatedMultisig[0].addresses
      });
      wallet2 = new WalletHelper('multisig-2', {
        seedKey: 'multisig-2',
        multisig: true,
        preCalculatedAddresses: precalculatedMultisig[1].addresses
      });
      wallet3 = new WalletHelper('multisig-3', {
        seedKey: 'multisig-3',
        multisig: true,
        preCalculatedAddresses: precalculatedMultisig[2].addresses
      });
      wallet4 = new WalletHelper('multisig-4', {
        seedKey: 'multisig-4',
        multisig: true,
        preCalculatedAddresses: precalculatedMultisig[3].addresses
      });
      wallet5 = new WalletHelper('multisig-5', {
        seedKey: 'multisig-5',
        multisig: true,
        preCalculatedAddresses: precalculatedMultisig[4].addresses
      });
      walletExtra = new WalletHelper('multisig-extra', {
        seedKey: 'multisig-extra',
        multisig: true,
        preCalculatedAddresses: precalculatedMultisig[5].addresses
      });

      await WalletHelper.startMultipleWalletsForTest([
        wallet1, wallet2, wallet3, wallet4, wallet5, walletExtra]);

      // Funds for single input/output tests
      const fundTxObj1 = await wallet1.injectFunds(1000, 0);

      fundTx1.txId = fundTxObj1.hash;
      fundTx1.index = TestUtils.getOutputIndexFromTx(fundTxObj1, 1000);

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
    await wallet3.stop();
    await wallet4.stop();
    await wallet5.stop();
    await walletExtra.stop();
  });

  it('Should fail to send a transaction with less than minimum signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: precalculatedMultisig[0].addresses[0], value: 100 },
        { address: precalculatedMultisig[0].addresses[1], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[should fail lt minsig]: proposal', { body: response.body });

    const { txHex } = response.body;

    // collect signatures from 2 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    loggers.test.insertLineToLog('multisig[should fail lt minsig]: signatures', { signatures: [sig1, sig2] });

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[should fail lt minsig]: sign+push', { body: response.body });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should fail to send a transaction with incorrect signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: precalculatedMultisig[0].addresses[0], value: 100 },
        { address: precalculatedMultisig[0].addresses[1], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[should fail invalid sig]: proposal', { body: response.body });

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();

    // Change sig3 to be invalid
    const p2shSig = hathorLib.P2SHSignature.deserialize(sig3);
    const invalidP2shSig = new hathorLib.P2SHSignature(p2shSig.pubkey, {});
    // eslint-disable-next-line no-unused-vars
    for (const [index, sig] of Object.entries(p2shSig.signatures)) {
      const buf = Buffer.from(sig, 'hex');
      for (let i = 0; i < buf.length; i++) {
        buf[i]++;
      }
      invalidP2shSig.signatures[index] = buf.toString('hex');
    }
    const invalidSig = invalidP2shSig.serialize();
    loggers.test.insertLineToLog('multisig[should fail invalid sig]: signatures', { signatures: [sig1, sig2, sig3, invalidSig] });

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, invalidSig] })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[should fail invalid sig]: response', { body: response.body });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should send a transaction with minimum signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: precalculatedMultisig[0].addresses[1], value: 100 },
        { address: precalculatedMultisig[0].addresses[0], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[should send minsig]: proposal', { body: response.body });

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();
    loggers.test.insertLineToLog('multisig[should send minsig]: signatures', { signatures: [sig1, sig2, sig3] });

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, sig3] })
      .set({ 'x-wallet-id': wallet1.walletId });

    await TestUtils.pauseForWsUpdate();

    loggers.test.insertLineToLog('multisig[should send minsig]: sign+push', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
  });

  it('Should fail to send a transaction with more than min signatures', async () => {
    const tx = {
      outputs: [
        { address: precalculatedMultisig[0].addresses[0], value: 100 },
        { address: precalculatedMultisig[0].addresses[1], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[should fail gt minsig]: proposal', { body: response.body });

    const { txHex } = response.body;

    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();
    const sig4 = await wallet4.getSignatures(txHex);
    expect(sig4).toBeTruthy();
    const signatures = [sig1, sig2, sig3, sig4];
    loggers.test.insertLineToLog('multisig[should fail gt minsig]: signatures', { signatures });

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    loggers.test.insertLineToLog('multisig[should fail gt minsig]: sign+push', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
