import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

describe('utxo-consolidation routes', () => {
  /** @type WalletHelper */
  let wallet1;
  let wallet2;

  const tokenA = {
    name: 'Token A',
    symbol: 'TKA',
    uid: ''
  };

  beforeAll(async () => {
    try {
      // First wallet, no balance. Will receive UTXOs to consolidate.
      wallet1 = WalletHelper.getPrecalculatedWallet('consolidate-utxo-1');
      // Second wallet with custom token, source of funds
      wallet2 = WalletHelper.getPrecalculatedWallet('consolidate-utxo-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);

      await wallet2.injectFunds(1010, 0);

      const tkaTx = await wallet2.createToken({
        name: tokenA.name,
        symbol: tokenA.symbol,
        amount: 1000,
        change_address: await wallet2.getAddressAt(0),
        address: await wallet2.getAddressAt(1)
      });
      tokenA.uid = tkaTx.hash;

      /*
       * Initial scenario:
       *
       * Wallet1: empty
       * Wallet2:
       * - addr0: 1000 htr
       * - addr1: 1000 tka
       */
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  /**
   * Helper function to empty wallet1 of a specified token and move it all back to wallet2.
   * This minimizes test dependency.
   * @param {string} [token]
   * @returns {Promise<unknown>}
   */
  async function cleanWallet1(token) {
    const balance = await wallet1.getBalance(token);

    // The wallet helper methods already await for the tx in its own wallet
    await wallet1.sendTx({
      outputs: [{ address: await wallet2.getAddressAt(0), value: balance.available, token }],
      destinationWallet: wallet2.walletId,
      title: 'Cleaning up wallet1 after test'
    });
  }

  it('should reject for missing destination address', async () => {
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({})
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(utxoResponse.text).toContain('Invalid');
    expect(utxoResponse.text).toContain('destination_address');
  });

  it('should reject for an empty wallet', async () => {
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: await wallet1.getAddressAt(1),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(utxoResponse.status).toBe(200);
    expect(utxoResponse.body.error).toContain('available utxo');
  });

  it('should reject for an empty wallet (custom token)', async () => {
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: await wallet1.getAddressAt(1),
        token: tokenA.uid,
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(utxoResponse.status).toBe(200);
    expect(utxoResponse.body.error).toContain('available utxo');
  });

  it('should reject for an empty address', async () => {
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        filter_address: await wallet1.getNextAddress(),
        destination_address: await wallet1.getAddressAt(1),
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(utxoResponse.status).toBe(200);
    expect(utxoResponse.body.error).toContain('available utxo');
  });

  it('should reject for an empty address (custom token)', async () => {
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        filter_address: await wallet1.getNextAddress(),
        destination_address: await wallet1.getAddressAt(1),
        token: tokenA.uid,
        dontLogErrors: true
      })
      .set({ 'x-wallet-id': wallet1.walletId });

    expect(utxoResponse.status).toBe(200);
    expect(utxoResponse.body.error).toContain('available utxo');
  });

  it('should consolidate two UTXOs', async () => {
    const fundTx = await wallet2.sendTx({
      outputs: [
        { address: await wallet1.getAddressAt(1), value: 10 },
        { address: await wallet1.getAddressAt(2), value: 20 },
      ],
      destinationWallet: wallet1.walletId
    });

    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: await wallet1.getAddressAt(0)
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    const consolidateTx = utxoResponse.body;

    // Evaluating consolidation results
    expect(consolidateTx.total_amount).toBe(30);
    expect(consolidateTx.total_utxos_consolidated).toBe(2);

    // Evaluating individual source utxos
    const sourceUtxo10 = consolidateTx.utxos.find(u => u.amount === 10);
    expect(sourceUtxo10.tx_id).toBe(fundTx.hash);
    const sourceUtxo20 = consolidateTx.utxos.find(u => u.amount === 20);
    expect(sourceUtxo20.tx_id).toBe(fundTx.hash);

    await TestUtils.waitForTxReceived(wallet1.walletId, consolidateTx.txId);

    // Evaluating destination address balance and utxos
    const destinationUtxos = await wallet1.getUtxos({
      filter_address: await wallet1.getAddressAt(0)
    });
    expect(destinationUtxos.total_amount_available).toBe(30);
    expect(destinationUtxos.total_utxos_available).toBe(1);

    const utxo = destinationUtxos.utxos[0];
    expect(utxo.tx_id).toBe(consolidateTx.txId);
    expect(utxo.amount).toBe(30);

    // Cleaning up
    await cleanWallet1();
  });

  it('should consolidate two UTXOs (custom token)', async () => {
    const fundTx = await wallet2.sendTx({
      outputs: [
        { address: await wallet1.getAddressAt(1), value: 10, token: tokenA.uid },
        { address: await wallet1.getAddressAt(2), value: 20, token: tokenA.uid },
      ],
      destinationWallet: wallet1.walletId
    });

    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: await wallet1.getAddressAt(0),
        token: tokenA.uid
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    const consolidateTx = utxoResponse.body;

    // Evaluating consolidation results
    expect(consolidateTx.total_amount).toBe(30);
    expect(consolidateTx.total_utxos_consolidated).toBe(2);

    // Evaluating individual source utxos
    const sourceTka10 = consolidateTx.utxos.find(u => u.amount === 10);
    expect(sourceTka10.tx_id).toBe(fundTx.hash);
    const sourceTka20 = consolidateTx.utxos.find(u => u.amount === 20);
    expect(sourceTka20.tx_id).toBe(fundTx.hash);

    await TestUtils.waitForTxReceived(wallet1.walletId, consolidateTx.txId);

    // Evaluating destination address balance and utxos
    const destinationUtxos = await wallet1.getUtxos({
      filter_address: await wallet1.getAddressAt(0),
      token: tokenA.uid
    });
    expect(destinationUtxos.total_amount_available).toBe(30);
    expect(destinationUtxos.total_utxos_available).toBe(1);

    const tkaUtxo = destinationUtxos.utxos[0];
    expect(tkaUtxo.tx_id).toBe(consolidateTx.txId);
    expect(tkaUtxo.amount).toBe(30);

    // Cleaning up
    await cleanWallet1(tokenA.uid);
  });

  it('should consolidate with filter_address filter', async () => {
    const addr1 = await wallet1.getAddressAt(1);
    const addr2 = await wallet1.getAddressAt(2);

    await wallet2.sendTx({
      outputs: [
        { address: addr1, value: 10 },
        { address: addr1, value: 20 },
        { address: addr2, value: 10 },
        { address: addr2, value: 10 },
        { address: addr2, value: 10 },
      ],
      destinationWallet: wallet1.walletId
    });

    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: await wallet1.getAddressAt(0),
        filter_address: addr2
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    const consolidateTx = utxoResponse.body;

    // Evaluating consolidation results
    expect(consolidateTx.total_amount).toBe(30);
    expect(consolidateTx.total_utxos_consolidated).toBe(3);
    for (const utxo of consolidateTx.utxos) {
      expect(utxo.address).toBe(addr2); // Only utxos from the correct address were used
    }

    await TestUtils.waitForTxReceived(wallet1.walletId, consolidateTx.txId);

    // Evaluating destination address balance and utxos
    const destinationUtxos = await wallet1.getUtxos({
      filter_address: await wallet1.getAddressAt(0)
    });
    expect(destinationUtxos.total_amount_available).toBe(30);
    expect(destinationUtxos.total_utxos_available).toBe(1);
    expect(destinationUtxos.utxos[0].tx_id).toBe(consolidateTx.txId);

    // Cleaning up
    await cleanWallet1();
  });

  it('should consolidate with amount_smaller_than filter', async () => {
    const addr1 = await wallet1.getAddressAt(1);

    await wallet2.sendTx({
      outputs: [
        { address: addr1, value: 10 },
        { address: addr1, value: 20 },
        { address: addr1, value: 30 },
        { address: addr1, value: 40 },
        { address: addr1, value: 50 },
      ],
      destinationWallet: wallet1.walletId
    });

    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: await wallet1.getAddressAt(2),
        amount_smaller_than: 31,
        filter_address: addr1
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    const consolidateTx = utxoResponse.body;

    // Evaluating consolidation results. Only source combination possible must be [10, 20, 30].
    expect(consolidateTx.total_amount).toBe(60);
    expect(consolidateTx.total_utxos_consolidated).toBe(3);

    await TestUtils.waitForTxReceived(wallet1.walletId, consolidateTx.txId);

    // Evaluating destination address balance and utxos
    const destinationUtxos = await wallet1.getUtxos({
      filter_address: await wallet1.getAddressAt(2)
    });
    expect(destinationUtxos.total_amount_available).toBe(60);
    expect(destinationUtxos.total_utxos_available).toBe(1);
    expect(destinationUtxos.utxos[0].tx_id).toBe(consolidateTx.txId);

    // Cleaning up
    await cleanWallet1();
  });

  it('should consolidate with amount_bigger_than filter', async () => {
    const addr0 = await wallet1.getAddressAt(0);

    await wallet2.sendTx({
      outputs: [
        { address: addr0, value: 10 },
        { address: addr0, value: 20 },
        { address: addr0, value: 30 },
        { address: addr0, value: 40 },
        { address: addr0, value: 50 },
      ],
      destinationWallet: wallet1.walletId
    });

    const destinationAddress = await wallet1.getAddressAt(2);
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: destinationAddress,
        amount_bigger_than: 29,
        filter_address: addr0
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    const consolidateTx = utxoResponse.body;

    // Evaluating results. Only source combination must be [30, 40, 50]
    expect(consolidateTx.total_amount).toBe(120);
    expect(consolidateTx.total_utxos_consolidated).toBe(3);

    await TestUtils.waitForTxReceived(wallet1.walletId, consolidateTx.txId);

    // Evaluating destination address balance and utxos
    const destinationUtxos = await wallet1.getUtxos({
      filter_address: destinationAddress
    });

    expect(destinationUtxos.total_amount_available).toBe(120);
    expect(destinationUtxos.total_utxos_available).toBe(1);
    expect(destinationUtxos.utxos[0].tx_id).toBe(consolidateTx.txId);

    // Cleaning up
    await cleanWallet1();
  });

  it('should consolidate with amount_bigger_than and maximum_amount filters', async () => {
    const addr0 = await wallet1.getAddressAt(0);

    await wallet2.sendTx({
      outputs: [
        { address: addr0, value: 10 },
        { address: addr0, value: 20 },
        { address: addr0, value: 30 },
        { address: addr0, value: 40 },
        { address: addr0, value: 50 },
      ],
      destinationWallet: wallet1.walletId
    });

    const destinationAddress = await wallet1.getAddressAt(2);
    const utxoResponse = await TestUtils.request
      .post('/wallet/utxo-consolidation')
      .send({
        destination_address: destinationAddress,
        amount_bigger_than: 30,
        maximum_amount: 100,
        filter_address: addr0
      })
      .set({ 'x-wallet-id': wallet1.walletId });
    const consolidateTx = utxoResponse.body;

    // Evaluating results. Only possible combination is [40, 50]
    expect(consolidateTx.total_amount).toBe(90);
    expect(consolidateTx.total_utxos_consolidated).toBe(2);
    expect(consolidateTx.utxos).toEqual(expect.arrayContaining([
      expect.objectContaining({ amount: 40 }),
      expect.objectContaining({ amount: 50 }),
    ]));

    await TestUtils.waitForTxReceived(wallet1.walletId, consolidateTx.txId);

    // Evaluating destination address balance and utxos
    const destinationUtxos = await wallet1.getUtxos({
      filter_address: destinationAddress
    });
    expect(destinationUtxos.total_amount_available).toBe(90);
    expect(destinationUtxos.total_utxos_available).toBe(1);
    expect(destinationUtxos.utxos[0].tx_id).toBe(consolidateTx.txId);

    // Cleaning up
    await cleanWallet1();
  });
});
