import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

/**
 * A wallet's shielded funds as the API shows and spends them: the balance
 * split between transparent and shielded funds, a shielded UTXO given as an
 * explicit input, and a custom token the wallet holds only in shielded UTXOs.
 *
 * The tests run in order and share the two wallets, so the receiver's funds
 * are known exactly at each step.
 */
describe('shielded funds', () => {
  /** @type WalletHelper */
  let sender;
  /** @type WalletHelper */
  let receiver;

  async function getSplitBalance(wallet, token) {
    const response = await TestUtils.request
      .get('/wallet/balance')
      .query({ split: true, ...(token ? { token } : {}) })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.status).toBe(200);
    return response.body;
  }

  async function getShieldedUtxos(wallet, token) {
    const response = await TestUtils.request
      .get('/wallet/utxo-filter')
      .query({ shielded: true, ...(token ? { token } : {}) })
      .set(TestUtils.generateHeader(wallet.walletId));
    expect(response.status).toBe(200);
    return response.body.utxos;
  }

  beforeAll(async () => {
    sender = WalletHelper.getPrecalculatedWallet('shielded-funds-sender');
    receiver = WalletHelper.getPrecalculatedWallet('shielded-funds-receiver');
    await WalletHelper.startMultipleWalletsForTest([sender, receiver]);
    await sender.injectFunds(2000, 0);
  });

  afterAll(async () => {
    await sender.stop();
    await receiver.stop();
  });

  it('should split the balance between transparent and shielded funds', async () => {
    await sender.sendTx({
      outputs: [
        { address: await receiver.getAddressAt(0), value: 100 },
        { address: await receiver.getShieldedAddressAt(0), value: 300, shielded: 1 },
        { address: await receiver.getShieldedAddressAt(1), value: 200, shielded: 1 },
      ],
      destinationWallet: receiver.walletId,
    });

    expect(await getSplitBalance(receiver)).toEqual({
      available: 600,
      locked: 0,
      transparent: { available: 100, locked: 0 },
      shielded: { available: 500, locked: 0 },
    });

    // The sender's buckets add up to its totals too, whatever change it got
    const senderBalance = await getSplitBalance(sender);
    expect(senderBalance.transparent.available + senderBalance.shielded.available)
      .toBe(senderBalance.available);
    expect(senderBalance.transparent.locked + senderBalance.shielded.locked)
      .toBe(senderBalance.locked);
  });

  it('should spend a shielded utxo given as an explicit input', async () => {
    const utxos = await getShieldedUtxos(receiver);
    expect(utxos.map(utxo => utxo.amount).sort()).toEqual([200, 300]);
    const spent = utxos.find(utxo => utxo.amount === 300);

    const tx = await receiver.sendTx({
      inputs: [{ hash: spent.tx_id, index: spent.index }],
      outputs: [
        { address: await sender.getShieldedAddressAt(0), value: 100, shielded: 1 },
      ],
      destinationWallet: sender.walletId,
    });

    // The tx spends exactly that input, and its outputs are all shielded: the
    // payment and the change, which pays the fee from the input
    const decoded = await TestUtils.getTransaction(receiver.walletId, tx.hash);
    expect(decoded.inputs.map(input => [input.tx_id, input.index]))
      .toEqual([[spent.tx_id, spent.index]]);
    expect(decoded.outputs).toHaveLength(0);
    expect(decoded.shielded_outputs.length).toBeGreaterThanOrEqual(2);

    const fee = await TestUtils.getShieldedOutputsFee(receiver.walletId, tx.hash);
    const remaining = (await getShieldedUtxos(receiver)).map(utxo => [utxo.tx_id, utxo.index]);
    expect(remaining).not.toContainEqual([spent.tx_id, spent.index]);

    // The transparent funds were not touched
    expect(await getSplitBalance(receiver)).toEqual({
      available: 600 - 100 - fee,
      locked: 0,
      transparent: { available: 100, locked: 0 },
      shielded: { available: 500 - 100 - fee, locked: 0 },
    });
  });

  it('should spend a custom token held only in shielded utxos', async () => {
    const tokenTx = await sender.createToken({
      name: 'Shielded Funds Token',
      symbol: 'SFT',
      amount: 1000,
    });
    const tokenUid = tokenTx.hash;

    const tokenAddr0 = await receiver.getShieldedAddressAt(2);
    const tokenAddr1 = await receiver.getShieldedAddressAt(3);
    await sender.sendTx({
      outputs: [
        { address: tokenAddr0, value: 300, token: tokenUid, shielded: 1 },
        { address: tokenAddr1, value: 200, token: tokenUid, shielded: 1 },
      ],
      destinationWallet: receiver.walletId,
    });
    expect(await getSplitBalance(receiver, tokenUid)).toEqual({
      available: 500,
      locked: 0,
      transparent: { available: 0, locked: 0 },
      shielded: { available: 500, locked: 0 },
    });

    const senderBefore = await sender.getBalance(tokenUid);
    const tx = await receiver.sendTx({
      outputs: [
        { address: await sender.getShieldedAddressAt(1), value: 100, token: tokenUid, shielded: 1 },
      ],
      destinationWallet: sender.walletId,
    });
    expect(tx.hash).toBeDefined();

    // The token is spent from shielded utxos, and its change is shielded
    expect(await getSplitBalance(receiver, tokenUid)).toEqual({
      available: 400,
      locked: 0,
      transparent: { available: 0, locked: 0 },
      shielded: { available: 400, locked: 0 },
    });
    const senderAfter = await sender.getBalance(tokenUid);
    expect(senderAfter.available - senderBefore.available).toBe(100);
  });
});
