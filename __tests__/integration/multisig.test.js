import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

import hathorLib from '@hathor/wallet-lib';

describe('send tx (HTR)', () => {
  let wallet1;
  let wallet2;
  let wallet3;
  let wallet4;
  let wallet5;
  let walletExtra;

  const words = [
    'upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind',
    'sample garment fun depart various renew require surge service undo cinnamon squeeze hundred nasty gasp ridge surge defense relax turtle wet antique october occur',
    'intact wool rigid diary mountain issue tiny ugly swing rib alone base fold satoshi drift poverty autumn mansion state globe plug ancient pudding hope',
  ];

  const pubkeys = [
    'xpub6CvvCBtHqFfErbcW2Rv28TmZ3MqcFuWQVKGg8xDzLeAwEAHRz9LBTgSFSj7B99scSvZGbq6TxAyyATA9b6cnwsgduNs9NGKQJnEQr3PYtwK',
    'xpub6CA16g2qPwukWAWBMdJKU3p2fQEEi831W3WAs2nesuCzPhbrG29aJsoRDSEDT4Ac3smqSk51uuv6oujU3MAAL3d1Nm87q9GDwE3HRGQLjdP',
    'xpub6BwNT613Vzy7ARVHDEpoX23SMBEZQMJXdqTWYjQKvJZJVDBjEemU38exJEhc6qbFVc4MmarN68gUKHkyZ3NEgXXCbWtoXXGouHpwMEcXJLf',
  ];

  const multisigData = {
    pubkeys,
    total: 3,
    minSignatures: 2,
  };

  const addresses = [
    'wbgBYkMMQDvd2pGNFYkLKgn2bjX4Fh1wWR',
    'wbB7LcWSuSbZcZi336nx7CbGMfAi78LpVh',
    'wYBwFDdHurqNGRNHXYy7c59FAU3AK5MRKz',
    'wdF5PWRfhgzhwqDeYsZXb1chYu2KQJfTqn',
    'wMCsXvDBnF6uRYfQa8gxSwBZBBE7C9qwLv',
    'wQT94F2BY5xEYTVBt594mJZkPNy17KzY7c',
    'wTy9nRcc2h87WFX3WXr6rjPhuqzKj97vAZ',
    'wSpq6Aw86d74Ls27HFgReZJWCNHt9uY3jy',
    'wR9FTFUcv2pmHMn8CQ9DNSnVGp63FeEy5C',
    'wQV4wfT2tAFruMHjbKjnWjsdMcucmYP79o',
    'wXDtsGUYcHShesUZWQ2eN8Pu5ruTFWeQkP',
    'wQvk4pC82swkJWWUqhabxb6ArkBcUcAruj',
    'weDqhgJ1HTEmiD341mcYUmeCfJdezAuNnC',
    'wY2TxKXexPHSqDyeDoy5DGRQ6dmtGixyUK',
    'wSe9ic5Q9irW2f5kCrLE1vx1yznRPMmYum',
    'wRCfRVpFt761yH4SyMejPeBQ16aqBtAgcQ',
    'wKtAEgPGDCHSnw1eSgsrpsScmTMd9j6LK8',
    'wZ1CkKWxRyiDSVSsrRBzpPcLcxNBsG4y7R',
    'wXXbVcoXvaBUPS6tDpXSJRq3agYFA8A7wN',
    'wep5w3zMiMqYjg4VNVvuGRo2tmeSviv6ii',
    'wNLzdH6gPbEwHYZFtfkXqxFVKzRhxEA2KN',
  ];

  const fundTx1 = {
    txId: null,
    index: null
  }; // Fund for auto-input transactions

  beforeAll(async () => {
    global.config.seeds = {
      'multisig-1': words[0],
      'multisig-2': words[1],
      'multisig-3': words[2],
      'multisig-extra': words[4],
    };
    global.config.multisig = {
      'multisig-1': multisigData,
      'multisig-2': multisigData,
      'multisig-3': multisigData,
      'multisig-extra': {
        pubkeys: pubkeys.slice(0, 1),
        total: 1,
        minSignatures: 1,
      },
    };
    try {
      wallet1 = new WalletHelper('multisig-1', { seedKey: 'multisig-1', multisig: true });
      wallet2 = new WalletHelper('multisig-2', { seedKey: 'multisig-2', multisig: true });
      wallet3 = new WalletHelper('multisig-3', { seedKey: 'multisig-3', multisig: true });
      walletExtra = new WalletHelper('multisig-extra', { seedKey: 'multisig-extra', multisig: true });

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2, wallet3, walletExtra]);

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
    await walletExtra.stop();
  });

  it('Should fail to send a transaction with less than minimum signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 100 },
        { address: "wbgBYkMMQDvd2pGNFYkLKgn2bjX4Fh1wWR", value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    const txHex = response.body.txHex;

    // collect signatures from 2 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1] })
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should fail to send a transaction with more than max signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 100 },
        { address: "wbgBYkMMQDvd2pGNFYkLKgn2bjX4Fh1wWR", value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    const txHex = response.body.txHex;

    // collect signatures from all wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();
    const sig3 = await wallet3.getSignatures(txHex);
    expect(sig3).toBeTruthy();
    // Get an extra signature
    const sigExtra = await walletExtra.getSignatures(txHex);
    expect(sigExtra).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2, sig3, sigExtra] })
      .set({ 'x-wallet-id': wallet1.walletId });
    console.log(JSON.stringify(response.body));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should fail to send a transaction with incorrect signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 100 },
        { address: "wbgBYkMMQDvd2pGNFYkLKgn2bjX4Fh1wWR", value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });

    const txHex = response.body.txHex;

    // collect signatures from 3 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();

    // Change sig3 to be invalid
    const p2shSig = hathorLib.P2SHSignature.deserialize(sig2);
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
      .send({ txHex, signatures: [sig1, invalidSig] })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('Should send a transaction with minimum signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 100 },
        { address: "wbgBYkMMQDvd2pGNFYkLKgn2bjX4Fh1wWR", value: 270 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });

    const txHex = response.body.txHex;

    // collect signatures from 3 wallets
    const sig1 = await wallet1.getSignatures(txHex);
    expect(sig1).toBeTruthy();
    const sig2 = await wallet2.getSignatures(txHex);
    expect(sig2).toBeTruthy();

    // try to send
    response = await TestUtils.request
      .post('/wallet/tx-proposal/sign-and-push')
      .send({ txHex, signatures: [sig1, sig2] })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.hash).toBeDefined();
  });

  it('Should send a transaction with max signatures', async () => {
    const tx = {
      outputs: [
        { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 1 },
        { address: "wbgBYkMMQDvd2pGNFYkLKgn2bjX4Fh1wWR", value: 2 },
      ],
    };

    // wallet1 proposes the transaction
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': wallet1.walletId });

    const txHex = response.body.txHex;

    // collect signatures from 5 wallets
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
});
