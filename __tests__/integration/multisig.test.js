import hathorLib from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import { multisigWalletsData } from '../../src/helpers/wallet-precalculation.helper';
import precalculatedMultisig from './configuration/precalculated-multisig-wallets.json';

describe.skip('send tx (HTR)', () => {
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
        minSignatures: 2, // Having a different minSignatures will change the wallet completely
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
        { address: precalculatedMultisig[0].addresses[1], value: 100 },
        { address: precalculatedMultisig[0].addresses[2], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    const { txHex } = response.body;

    // collect signatures from 2 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2] })
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should fail to send a transaction with more than max signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: precalculatedMultisig[0].addresses[1], value: 100 },
        { address: precalculatedMultisig[0].addresses[2], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    const { txHex } = response.body;

    // collect signatures from all wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();
    const sig4 = await wallet4.getSignatures(txHex);
    expect(sig4).toBeTruthy();
    const sig5 = await wallet5.getSignatures(txHex);
    expect(sig5).toBeTruthy();
    // Get an extra signature
    const sig6 = await walletExtra.getSignatures(txHex);
    expect(sig6).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, sig3, sig4, sig5, sig6] })
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should fail to send a transaction with incorrect signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: precalculatedMultisig[0].addresses[1], value: 100 },
        { address: precalculatedMultisig[0].addresses[2], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });

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
    // eslint-disable-next-line no-unused-vars
    for (const [index, sig] of Object.entries(p2shSig.signatures)) {
      const buf = Buffer.from(sig, 'hex');
      for (let i = 0; i < buf.length; i++) {
        buf[i]++;
      }
    }
    const invalidSig = p2shSig.serialize();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, invalidSig] })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  /*
   * Skipping the actual multisig tests until we find the reason it is failing
   */
  it.skip('Should send a transaction with minimum signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: precalculatedMultisig[0].addresses[1], value: 100 },
        { address: precalculatedMultisig[0].addresses[2], value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, sig3] })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
  });

  /*
   * Skipping the actual multisig tests until we find the reason it is failing
   */
  it.skip('Should send a transaction with max signatures', async () => {
    const tx = {
      outputs: [
        { address: precalculatedMultisig[0].addresses[1], value: 1 },
        { address: precalculatedMultisig[0].addresses[2], value: 2 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });

    const { txHex } = response.body;

    // collect signatures from 5 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();
    const sig4 = await wallet4.getSignatures(txHex);
    expect(sig4).toBeTruthy();
    const sig5 = await wallet5.getSignatures(txHex);
    expect(sig5).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, sig3, sig4, sig5] })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
  });
});
