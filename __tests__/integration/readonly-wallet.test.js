import { walletUtils, transactionUtils } from '@hathor/wallet-lib';
import { precalculationHelpers, singleMultisigWalletData } from '../../scripts/helpers/wallet-precalculation.helper';
import { TestUtils } from './utils/test-utils-integration';
import { loggers } from './utils/logger.util';
import { WalletHelper } from './utils/wallet-helper';
import settings from '../../src/settings';

function newReadOnlyWallet() {
  const config = settings.getConfig();
  const accountDerivationIndex = '0\'/0';
  const { words, addresses } = precalculationHelpers.test.getPrecalculatedWallet();
  const xpubkey = walletUtils.getXPubKeyFromSeed(words, {
    networkName: config.network,
    accountDerivationIndex,
  });
  return { xpubkey, words, addresses };
}

describe('Readonly wallet', () => {
  const { walletConfig: multisigWalletConfig } = singleMultisigWalletData;

  beforeAll(async () => {
    const config = settings.getConfig();
    config.multisig = { multisig: multisigWalletConfig };
    settings._setConfig(config);
  });

  afterAll(async () => {
    const config = settings.getConfig();
    config.multisig = {};
    settings._setConfig(config);
  });

  it('should start readonly wallets', async () => {
    const walletId = 'readonlyWalletStart';
    const { xpubkey, addresses } = newReadOnlyWallet();
    // We will not use precalculated addresses here
    // so we can test the wallet was started correctly
    let response = await TestUtils.request
      .post('/start')
      .send({
        xpubkey,
        'wallet-id': walletId,
      });

    expect(response.status).toEqual(200);
    expect(response.body.success).toBe(true);
    try {
      // Wait until the wallet has actually started
      await TestUtils.poolUntilWalletReady(walletId);
      // If timeout is not reached we can assume the wallet has started
      // We will confirm the first address to ensure the wallet was started correctly
      response = await TestUtils.request
        .get('/wallet/address')
        .query({ index: 0 })
        .set({ 'x-wallet-id': walletId });
      loggers.test.insertLineToLog('readonly[start]: get address', { body: response.body });
      expect(response.body.address).toEqual(addresses[0]);
    } finally {
      // Cleanup
      await TestUtils.stopWallet(walletId);
    }
  });

  it('should start readonly multisig wallets', async () => {
    const walletId = 'readonlyMultisigWalletStart';
    const { xpubkey, addresses } = newReadOnlyWallet();
    // We will not use precalculated addresses here
    // so we can test the wallet was started correctly
    let response = await TestUtils.request
      .post('/start')
      .send({
        xpubkey,
        'wallet-id': walletId,
        multisigKey: 'multisig',
      });
    loggers.test.insertLineToLog('readonly[multisig]: get address', { body: response.body });
    expect(response.status).toEqual(200);
    expect(response.body.success).toBe(true);
    try {
      // Wait until the wallet has actually started
      await TestUtils.poolUntilWalletReady(walletId);
      // If timeout is not reached we can assume the wallet has started
      // We will confirm the first address to ensure the wallet was started correctly
      response = await TestUtils.request
        .get('/wallet/address')
        .query({ index: 0 })
        .set({ 'x-wallet-id': walletId });

      expect(response.body.address).toEqual(addresses[0]);
    } finally {
      // Cleanup
      await TestUtils.stopWallet(walletId);
    }
  });

  it('should create a transaction to be signed offline', async () => {
    const walletId = 'readonlyCreateTx';
    const { xpubkey, addresses, words } = newReadOnlyWallet();

    let response = await TestUtils.request
      .post('/start')
      .send({
        xpubkey,
        'wallet-id': walletId,
        precalculatedAddresses: addresses,
      });
    expect(response.status).toEqual(200);
    expect(response.body.success).toBe(true);
    try {
      // Wait until the wallet has actually started
      await TestUtils.poolUntilWalletReady(walletId);
      await WalletHelper.startMultipleWalletsForTest([]);
      // Inject funds in wallet
      await TestUtils.injectFundsIntoAddress(addresses[0], 100, walletId);

      // Insufficient funds due to query
      response = await TestUtils.request
        .post('/wallet/tx-proposal')
        .send({
          inputs: [{ type: 'query', filter_address: addresses[1] }],
          outputs: [{ address: addresses[2], value: 10 }],
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);

      // Get a transaction to be signed offline
      response = await TestUtils.request
        .post('/wallet/tx-proposal')
        .send({
          outputs: [{ address: addresses[1], value: 10 }],
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        txHex: expect.any(String),
      });

      const { txHex, dataToSignHash } = response.body;

      response = await TestUtils.request
        .get('/wallet/tx-proposal/get-wallet-inputs')
        .query({ txHex })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);

      const signatures = [];
      const config = settings.getConfig();

      const { inputs } = response.body;

      for (const input of inputs) {
        const xprivRoot = walletUtils.getXPrivKeyFromSeed(words, { networkName: config.network });
        const xpriv = xprivRoot.deriveNonCompliantChild(input.addressPath);
        const signature = transactionUtils.getSignature(Buffer.from(dataToSignHash, 'hex'), xpriv.privateKey);
        signatures.push(signature);
      }

      // Generate input data
      const inputDatas = [];
      for (let i = 0; i < inputs.length; i++) {
        response = await TestUtils.request
          .post('/wallet/tx-proposal/input-data')
          .send({
            index: inputs[i].addressIndex,
            signature: signatures[i].toString('hex'),
          })
          .set({ 'x-wallet-id': walletId });
        expect(response.status).toBe(200);

        inputDatas.push({ index: i, data: response.body.inputData });
      }

      // Add signature to transaction hex
      response = await TestUtils.request
        .post('/wallet/tx-proposal/add-signatures')
        .send({
          txHex,
          signatures: inputDatas,
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);

      const finalTxHex = response.body.txHex;

      // Push tx
      response = await TestUtils.request
        .post('/push-tx')
        .send({
          txHex: finalTxHex,
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tx.hash).toBeDefined();
    } finally {
      // Cleanup
      await TestUtils.stopWallet(walletId);
    }
  });
});
