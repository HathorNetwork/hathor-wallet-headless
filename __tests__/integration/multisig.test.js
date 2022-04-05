import hathorLib from '@hathor/wallet-lib';
import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

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
    'monster opinion bracket aspect mask labor obvious hat matrix exact canoe race shift episode plastic debris dash sort motion juice leg mushroom maximum evidence',
    'tilt lab swear uncle prize favorite river myth assault transfer venue soap lady someone marine reject fork brain swallow notice glad salt sudden pottery',
  ];

  const pubkeys = [
    'xpub6CvvCBtHqFfErbcW2Rv28TmZ3MqcFuWQVKGg8xDzLeAwEAHRz9LBTgSFSj7B99scSvZGbq6TxAyyATA9b6cnwsgduNs9NGKQJnEQr3PYtwK',
    'xpub6CA16g2qPwukWAWBMdJKU3p2fQEEi831W3WAs2nesuCzPhbrG29aJsoRDSEDT4Ac3smqSk51uuv6oujU3MAAL3d1Nm87q9GDwE3HRGQLjdP',
    'xpub6BwNT613Vzy7ARVHDEpoX23SMBEZQMJXdqTWYjQKvJZJVDBjEemU38exJEhc6qbFVc4MmarN68gUKHkyZ3NEgXXCbWtoXXGouHpwMEcXJLf',
    'xpub6DCyPHg4AwXsdiMh7QSTHR7afmNVwZKHBBMFUiy5aCYQNaWp68ceQXYXCGQr5fZyLAe5hiJDdXrq6w3AXzvVmjFX9F7EdM87repxJEhsmjL',
    'xpub6CgPUcCCJ9pAK7Rj52hwkxTutSRv91Fq74Hx1SjN62eg6Mp3S3YCJFPChPaDjpp9jCbCZHibBgdKnfNdq6hE9umyjyZKUCySBNF7wkoG4uK',
  ];

  const multisigData = {
    pubkeys,
    total: 5,
    minSignatures: 3,
  };

  // const addresses = [
  //   'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
  //   'wbe2eJdyZVimA7nJjmBQnKYJSXmpnpMKgG',
  //   'wQQWdSZwp2CEGKsTvvbJ7i8HfHuV2i5QVQ',
  //   'wfrtq9cMe1YfixVgSKXQNQ5hjsmR4hpjP6',
  //   'wQG7itjdtZBsNTk9TG4f1HrehyQiAEMN18',
  //   'wfgSqHUHPtmj2GDy8YfasbPPcFh8L1GPMA',
  //   'wgZbCEMHHnhftCAwj7CRBmfi5TgBhfMZbk',
  //   'wdz9NeMac7jyVeP2WK4BJWsM1zpd9tgsBb',
  //   'wPs7WaRCqwC89uHycLbctDGmWPgH9oZvjp',
  //   'wWJJxvr6oSk7WZdE9rpSRMoE6ZqJ3i8VDc',
  //   'wbuDJtmM7vg8at2h5o3pTCHE4SASEFYusr',
  //   'wPNkywbiw8UHbRQkD3nZ3EHMQsjyTamh9u',
  //   'wQBNidXXYpE943BgydUNtarAwNzk612Yip',
  //   'wh2eCGzUK9rLThr5D6tyCfckHpBjS97ERA',
  //   'wZvajxVp3LabcZiY3XPrivrXiSS6wphRu7',
  //   'wgPbL1WzbrEntepHRC92UX6mA2EmaqfDqt',
  //   'wbdx4g3rucX3WHmZRXjPEKtRfZ7XSnCGKf',
  //   'wiKTnqSN11ukuCWEXRVrRTTPo2mw4fGue3',
  //   'wQ4aQP4YqJqfwshLggR2w1Gg3UFhhKhVKs',
  //   'wca2xk9S2MVn2UrKh78UScdwXz3xrTp8Ky',
  //   'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau',
  // ];

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
      'multisig-1': multisigData,
      'multisig-2': multisigData,
      'multisig-3': multisigData,
      'multisig-4': multisigData,
      'multisig-5': multisigData,
      'multisig-extra': {
        pubkeys,
        total: 5,
        minSignatures: 2, // Having a different minSignatures will change the wallet completely
      },
    };
    try {
      wallet1 = new WalletHelper('multisig-1', { seedKey: 'multisig-1', multisig: true });
      wallet2 = new WalletHelper('multisig-2', { seedKey: 'multisig-2', multisig: true });
      wallet3 = new WalletHelper('multisig-3', { seedKey: 'multisig-3', multisig: true });
      wallet4 = new WalletHelper('multisig-4', { seedKey: 'multisig-4', multisig: true });
      wallet5 = new WalletHelper('multisig-5', { seedKey: 'multisig-5', multisig: true });
      walletExtra = new WalletHelper('multisig-extra', { seedKey: 'multisig-extra', multisig: true });

      // TODO: Revert this a single call to startMultipleWalletsForTest after performance improvs.
      await WalletHelper.startMultipleWalletsForTest([wallet1]);
      await WalletHelper.startMultipleWalletsForTest([wallet2, wallet3]);
      await WalletHelper.startMultipleWalletsForTest([wallet4, wallet5]);
      await WalletHelper.startMultipleWalletsForTest([walletExtra]);

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
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 100 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 270 },
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
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 100 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 270 },
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
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 100 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 270 },
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

  it('Should send a transaction with minimum signatures', async () => {
    const tx = {
      input: [fundTx1],
      outputs: [
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 100 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 270 },
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

  it('Should send a transaction with max signatures', async () => {
    const tx = {
      outputs: [
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 1 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 2 },
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
