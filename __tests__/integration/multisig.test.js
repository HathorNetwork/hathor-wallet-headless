import hathorLib from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';
import { multisigWalletsData } from '../../scripts/helpers/wallet-precalculation.helper';
import precalculatedMultisig from './configuration/precalculated-multisig-wallets.json';
import { loggers } from './utils/logger.util';
import settings from '../../src/settings';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;
  let wallet3;
  let wallet4;
  let wallet5;
  let walletExtra;
  let wallets;
  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: null
  };

  const { words, pubkeys, walletConfig } = multisigWalletsData;

  const fundTx1 = {
    txId: null,
    index: null
  }; // Fund for auto-input transactions

  beforeAll(async () => {
    const config = settings.getConfig();
    config.seeds = {
      'multisig-1': words[0],
      'multisig-2': words[1],
      'multisig-3': words[2],
      'multisig-4': words[3],
      'multisig-5': words[4],
      'multisig-extra': words[4],
    };
    config.multisig = {
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
    settings._setConfig(config);
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

      // Set wallets
      wallets = [wallet1, wallet2, wallet3, wallet4, wallet5];

      // Creating a token for the tests
      const tkAtxHex = await wallet1.buildCreateToken({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 500,
        address: await wallet1.getAddressAt(0),
      });

      // try to send
      const tkAtx = await wallet1.signAndPush({ txHex: tkAtxHex, wallets, xSignatures: 3 });
      tokenA.uid = tkAtx.hash;
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
      .post('/wallet/p2sh/tx-proposal')
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
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
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
      .post('/wallet/p2sh/tx-proposal')
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
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
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
      .post('/wallet/p2sh/tx-proposal')
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
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, sig3] })
      .set({ 'x-wallet-id': wallet1.walletId });

    loggers.test.insertLineToLog('multisig[should send minsig]: sign+push', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);
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
      .post('/wallet/p2sh/tx-proposal')
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
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    loggers.test.insertLineToLog('multisig[should fail gt minsig]: sign+push', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('should mount the transaction with the correct change outputs', async () => {
    const network = new hathorLib.Network('testnet');
    const burnAddress = TestUtils.getBurnAddress();
    const response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal')
      .send({
        outputs: [{ address: burnAddress, value: 10 }]
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    loggers.test.insertLineToLog('multisig[change outputs]: proposal', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    const tx = hathorLib.helpersUtils.createTxFromHex(txHex, network);

    for (const output of tx.outputs) {
      const decoded = output.parseScript(network);
      if (decoded.address.base58 === burnAddress) {
        // This is the intended output
        expect(decoded.getType()).toBe('p2pkh');
        expect(output.value).toBe(10);
        continue;
      }

      // this is a change address and should be p2sh
      expect(decoded.getType()).toBe('p2sh');
      // This will test that the change address belongs to the wallet
      expect(wallet1.addresses).toContain(decoded.address.base58);
    }
  });

  // create-tokens, mint-tokens, melt-tokens, decode
  it('should create, mint and melt tokens with minimum signatures, and decode', async () => {
    // # Create Token
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 100,
        address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex: txHexCreateTokenToDecode } = response.body;

    // collect signatures from 3 wallets
    let signatures = await TestUtils.getXSignatures(txHexCreateTokenToDecode, wallets, 3);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex: txHexCreateTokenToDecode, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });
    const txCreateToken = response.body;
    const tokenUid = txCreateToken.hash;

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();

    // # Mint
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/mint-tokens')
      .send({
        token: tokenUid,
        amount: 1,
        address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex: txHexMintTokenToDecode } = response.body;

    // collect signatures from 3 wallets
    signatures = await TestUtils.getXSignatures(txHexMintTokenToDecode, wallets, 3);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex: txHexMintTokenToDecode, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    // # Melt
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: tokenUid,
        amount: 100,
        deposit_address: address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex: txHexMeltTokenToDecode } = response.body;

    // collect signatures from 3 wallets
    signatures = await TestUtils.getXSignatures(txHexMeltTokenToDecode, wallets, 3);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex: txHexMeltTokenToDecode, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    await TestUtils.waitForTxReceived(wallet1.walletId, response.body.hash);

    const mctBalance = await wallet1.getBalance(tokenUid);
    expect(mctBalance.available).toBe(1);

    // Decode create token txHex
    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: txHexCreateTokenToDecode })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      tx: {
        completeSignatures: false,
        type: 'Create Token Transaction',
        version: 2,
        tokens: [],
        inputs: [
          {
            decoded: {
              type: 'MultiSig',
              address: expect.any(String),
              timelock: null,
            },
            txId: expect.any(String),
            // the previous tx has a change output, so they will be shuffled,
            // and we can't know the index
            index: expect.any(Number),
            token: '00',
            value: expect.any(Number), // we have little control over input value
            tokenData: 0,
            token_data: 0,
            script: expect.any(String),
            signed: false,
            mine: true,
          },
        ],
        outputs: expect.arrayContaining([
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            token: '00',
            value: expect.any(Number), // change output, we have little control over its value
            tokenData: 0,
            token_data: 0,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            value: 100,
            tokenData: 1,
            token_data: 1,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            value: 1,
            tokenData: 129,
            token_data: 129,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            value: 2,
            tokenData: 129,
            token_data: 129,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
        ]),
      },
      balance: {
        '00': {
          tokens: { available: -1, locked: 0 },
          authorities: {
            melt: { available: 0, locked: 0 },
            mint: { available: 0, locked: 0 },
          },
        },
        undefined: { // token here is undefined because it is not already created
          tokens: { available: 100, locked: 0 },
          authorities: {
            melt: { available: 1, locked: 0 },
            mint: { available: 1, locked: 0 },
          },
        },
      },
    });

    // Decode mint token txHex
    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: txHexMintTokenToDecode })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      tx: expect.objectContaining({
        completeSignatures: false,
        type: 'Transaction',
        version: 1,
        tokens: [txCreateToken.hash],
        inputs: [
          expect.objectContaining({
            decoded: {
              type: 'MultiSig',
              address: expect.any(String),
              timelock: null,
            },
            txId: expect.any(String),
            index: 0,
            token: '00',
            value: expect.any(Number),
            tokenData: 0,
            token_data: 0,
            script: expect.any(String),
            signed: false,
            mine: true,
          }),
          expect.objectContaining({
            decoded: {
              type: 'MultiSig',
              address: expect.any(String),
              timelock: null,
            },
            txId: expect.any(String),
            index: 2,
            token: tokenUid,
            value: 1,
            tokenData: 129,
            token_data: 129,
            script: expect.any(String),
            signed: false,
            mine: true,
          }),
        ],
        outputs: expect.arrayContaining([
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            token: '00',
            value: expect.any(Number),
            tokenData: 0,
            token_data: 0,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            token: tokenUid,
            value: 1,
            tokenData: 1,
            token_data: 1,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            token: tokenUid,
            value: 1,
            tokenData: 129,
            token_data: 129,
            script: expect.any(String),
            type: 'p2sh',
            mine: true,
          },
        ]),
      }),
      balance: {
        '00': {
          tokens: { available: -1, locked: 0 },
          authorities: {
            melt: { available: 0, locked: 0 },
            mint: { available: 0, locked: 0 },
          },
        },
        [tokenUid]: {
          tokens: { available: 1, locked: 0 },
          authorities: {
            melt: { available: 0, locked: 0 },
            mint: { available: 0, locked: 0 },
          },
        },
      },
    });

    // Decode melt token txHex
    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: txHexMeltTokenToDecode })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      tx: {
        type: 'Transaction',
        version: 1,
        tokens: [
          txCreateToken.hash,
        ],
        completeSignatures: false,
        inputs: [
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
              type: 'MultiSig',
            },
            index: 3,
            mine: true,
            script: expect.any(String),
            signed: false,
            token: tokenUid,
            tokenData: 129,
            token_data: 129,
            txId: expect.any(String),
            value: 2,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
              type: 'MultiSig',
            },
            index: 1,
            mine: true,
            script: expect.any(String),
            signed: false,
            token: tokenUid,
            tokenData: 1,
            token_data: 1,
            txId: expect.any(String),
            value: 100,
          },
        ],
        outputs: [
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            script: expect.any(String),
            token: tokenUid,
            tokenData: 129,
            token_data: 129,
            type: 'p2sh',
            value: 2,
            mine: true,
          },
          {
            decoded: {
              address: expect.any(String),
              timelock: null,
            },
            script: expect.any(String),
            token: '00',
            tokenData: 0,
            token_data: 0,
            type: 'p2sh',
            value: 1,
            mine: true,
          },
        ],
      },
      balance: {
        '00': {
          tokens: { available: 1, locked: 0 },
          authorities: {
            melt: { available: 0, locked: 0 },
            mint: { available: 0, locked: 0 },
          },
        },
        [tokenUid]: {
          tokens: { available: -100, locked: 0 },
          authorities: {
            melt: { available: 0, locked: 0 },
            mint: { available: 0, locked: 0 },
          },
        },
      },
    });
  });

  // create-token
  it('should fail to send a create-token transaction with less than minimum signatures', async () => {
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 100,
        address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 2);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error).toEqual('Quantity of signatures different than expected. Expected 3 Received 2');
  });

  it('Should fail to send a create-token transaction with incorrect signatures', async () => {
    const address = await wallet1.getAddressAt(0);
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 100,
        address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 2);
    const pubkey = precalculatedMultisig[0].multisigDebugData.pubkeys[0];
    const invalidP2shSig = new hathorLib.P2SHSignature(pubkey, {});
    signatures.push(invalidP2shSig.serialize());

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error).toEqual('Signatures are incompatible with redeemScript');
  });

  it('Should fail to send a create-token transaction with more than min signatures', async () => {
    const address = await wallet1.getAddressAt(0);
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/create-token')
      .send({
        name: 'My Custom Token',
        symbol: 'MCT',
        amount: 100,
        address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 4);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  // mint-token
  it('Should fail to send a mint-token transaction with less than minimum signatures', async () => {
    const address = await wallet1.getAddressAt(0);
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 500,
        address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 2);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('Should fail to send a mint-token transaction with incorrect signatures', async () => {
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 500,
        address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 2);
    const pubkey = precalculatedMultisig[0].multisigDebugData.pubkeys[0];
    const invalidP2shSig = new hathorLib.P2SHSignature(pubkey, {});
    signatures.push(invalidP2shSig.serialize());

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('Should fail to send a mint-token transaction with more than min signatures', async () => {
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/mint-tokens')
      .send({
        token: tokenA.uid,
        amount: 500,
        address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 4);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  // melt-token
  it('Should fail to send a melt-token transaction with less than minimum signatures', async () => {
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 500,
        deposit_address: address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 2);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('Should fail to send a melt-token transaction with incorrect signatures', async () => {
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 500,
        deposit_address: address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 2);
    const pubkey = precalculatedMultisig[0].multisigDebugData.pubkeys[0];
    const invalidP2shSig = new hathorLib.P2SHSignature(pubkey, {});
    signatures.push(invalidP2shSig.serialize());

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it('Should fail to send a melt-token transaction with more than min signatures', async () => {
    const address = precalculatedMultisig[0].addresses[0];
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/melt-tokens')
      .send({
        token: tokenA.uid,
        amount: 500,
        deposit_address: address,
        change_address: address,
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    expect(response.body.success).toBe(true);

    const { txHex } = response.body;

    // collect signatures from 3 wallets
    const signatures = await TestUtils.getXSignatures(txHex, wallets, 4);

    // try to send
    response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal/sign-and-push')
      .send({ txHex, signatures })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });
});
