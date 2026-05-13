import { TestUtils } from './utils/test-utils-integration';
import { WalletHelper } from './utils/wallet-helper';

/**
 * Integration tests for shielded (confidential) transactions.
 *
 * Prerequisites:
 * - @hathor/ct-crypto-node must be installed (provides native crypto for shielded outputs)
 * - The fullnode Docker image must support shielded outputs (experimental feature)
 */
describe('shielded transactions', () => {
  /** @type WalletHelper */
  let wallet1; // sender
  /** @type WalletHelper */
  let wallet2; // receiver

  beforeAll(async () => {
    try {
      wallet1 = WalletHelper.getPrecalculatedWallet('shielded-tx-1');
      wallet2 = WalletHelper.getPrecalculatedWallet('shielded-tx-2');

      await WalletHelper.startMultipleWalletsForTest([wallet1, wallet2]);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet1.stop();
    await wallet2.stop();
  });

  it('should send AmountShielded outputs and verify sender balance', async () => {
    const initialFunds = 1000;
    await wallet1.injectFunds(initialFunds, 0);

    const shieldedAddr0 = await wallet2.getShieldedAddressAt(0);
    const shieldedAddr1 = await wallet2.getShieldedAddressAt(1);

    const balanceBefore = await wallet1.getBalance();

    const shieldedTotal = 300 + 200;
    const tx = await wallet1.sendTx({
      outputs: [
        { address: shieldedAddr0, value: 300, shielded: 1 },
        { address: shieldedAddr1, value: 200, shielded: 1 },
      ],
      destinationWallet: wallet2.walletId,
    });

    expect(tx.hash).toBeDefined();

    const balanceAfter = await wallet1.getBalance();
    const spent = balanceBefore.available - balanceAfter.available;
    // Sender spent the shielded total + fee (1 HTR per AmountShielded output)
    expect(spent).toBe(shieldedTotal + 2);
  });

  it('should send FullShielded outputs', async () => {
    const initialFunds = 1000;
    await wallet1.injectFunds(initialFunds, 1);

    const shieldedAddr0 = await wallet2.getShieldedAddressAt(2);
    const shieldedAddr1 = await wallet2.getShieldedAddressAt(3);

    const balanceBefore = await wallet1.getBalance();

    const shieldedTotal = 250 + 150;
    const tx = await wallet1.sendTx({
      outputs: [
        { address: shieldedAddr0, value: 250, shielded: 2 },
        { address: shieldedAddr1, value: 150, shielded: 2 },
      ],
      destinationWallet: wallet2.walletId,
    });

    expect(tx.hash).toBeDefined();

    const balanceAfter = await wallet1.getBalance();
    const spent = balanceBefore.available - balanceAfter.available;
    // FullShielded fee is 2 HTR per output
    expect(spent).toBe(shieldedTotal + 4);
  });

  it('should send mixed transaction (transparent + shielded)', async () => {
    const initialFunds = 1000;
    await wallet1.injectFunds(initialFunds, 2);

    const addr2 = await wallet2.getAddressAt(2);
    const shieldedAddr3 = await wallet2.getShieldedAddressAt(4);
    const shieldedAddr4 = await wallet2.getShieldedAddressAt(5);

    const balanceBefore1 = await wallet1.getBalance();
    const balanceBefore2 = await wallet2.getBalance();

    const transparentAmount = 400;
    const shieldedTotal = 150 + 100;
    const tx = await wallet1.sendTx({
      outputs: [
        { address: addr2, value: transparentAmount },
        { address: shieldedAddr3, value: 150, shielded: 1 },
        { address: shieldedAddr4, value: 100, shielded: 1 },
      ],
      destinationWallet: wallet2.walletId,
    });

    expect(tx.hash).toBeDefined();

    // Wallet2 received the transparent output
    const balanceAfter2 = await wallet2.getBalance();
    expect(balanceAfter2.available - balanceBefore2.available)
      .toBeGreaterThanOrEqual(transparentAmount);

    // Sender balance decreased by transparent + shielded + fee
    const balanceAfter1 = await wallet1.getBalance();
    const spent = balanceBefore1.available - balanceAfter1.available;
    expect(spent).toBe(transparentAmount + shieldedTotal + 2);
  });

  it('should send shielded output to self', async () => {
    const initialFunds = 1000;
    await wallet1.injectFunds(initialFunds, 3);

    const shieldedAddr3 = await wallet1.getShieldedAddressAt(3);
    const shieldedAddr4 = await wallet1.getShieldedAddressAt(4);

    const balanceBefore = await wallet1.getBalance();

    const tx = await wallet1.sendTx({
      outputs: [
        { address: shieldedAddr3, value: 250, shielded: 1 },
        { address: shieldedAddr4, value: 150, shielded: 1 },
      ],
    });

    expect(tx.hash).toBeDefined();

    // After sending to self, balance should only decrease by the fee (2 HTR for 2 AmountShielded)
    const balanceAfter = await wallet1.getBalance();
    const spent = balanceBefore.available - balanceAfter.available;
    expect(spent).toBe(2);
  });

  it('should decrypt received shielded outputs and include in receiver balance', async () => {
    const sender = WalletHelper.getPrecalculatedWallet('shielded-decrypt-sender');
    const receiver = WalletHelper.getPrecalculatedWallet('shielded-decrypt-receiver');
    await WalletHelper.startMultipleWalletsForTest([sender, receiver]);

    try {
      const initialFunds = 1000;
      await sender.injectFunds(initialFunds, 0);

      const shieldedAddr0 = await receiver.getShieldedAddressAt(0);
      const shieldedAddr1 = await receiver.getShieldedAddressAt(1);

      const tx = await sender.sendTx({
        outputs: [
          { address: shieldedAddr0, value: 300, shielded: 1 },
          { address: shieldedAddr1, value: 200, shielded: 1 },
        ],
        destinationWallet: receiver.walletId,
      });

      expect(tx.hash).toBeDefined();

      // Receiver should see the full shielded amount in their balance
      const balanceR = await receiver.getBalance();
      expect(balanceR.available).toBe(500);
    } finally {
      await sender.stop();
      await receiver.stop();
    }
  });

  it('should reject shielded output with a legacy address', async () => {
    const legacyAddr = await wallet2.getAddressAt(5);

    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: legacyAddr, value: 100, shielded: 1 },
          { address: legacyAddr, value: 100, shielded: 1 },
        ],
      })
      .set(TestUtils.generateHeader(wallet1.walletId));

    expect(response.body.success).toBe(false);
  });

  it('should reject a single shielded output (Rule 4)', async () => {
    const shieldedAddr = await wallet2.getShieldedAddressAt(6);

    const response = await TestUtils.request
      .post('/wallet/send-tx')
      .send({
        outputs: [
          { address: shieldedAddr, value: 100, shielded: 1 },
        ],
      })
      .set(TestUtils.generateHeader(wallet1.walletId));

    expect(response.body.success).toBe(false);
  });

  it('should deduct correct fees for shielded outputs', async () => {
    // AmountShielded: 1 HTR per output, FullShielded: 2 HTR per output
    const initialFunds = 1000;
    await wallet1.injectFunds(initialFunds, 4);

    const shieldedAddr0 = await wallet2.getShieldedAddressAt(7);
    const shieldedAddr1 = await wallet2.getShieldedAddressAt(8);

    const balanceBefore = await wallet1.getBalance();

    // 1 AmountShielded (1 HTR fee) + 1 FullShielded (2 HTR fee) = 3 HTR total fee
    const tx = await wallet1.sendTx({
      outputs: [
        { address: shieldedAddr0, value: 100, shielded: 1 },
        { address: shieldedAddr1, value: 100, shielded: 2 },
      ],
      destinationWallet: wallet2.walletId,
    });

    expect(tx.hash).toBeDefined();

    const balanceAfter = await wallet1.getBalance();
    const spent = balanceBefore.available - balanceAfter.available;
    // 200 (values) + 1 (AmountShielded fee) + 2 (FullShielded fee) = 203
    expect(spent).toBe(203);
  });

  it('should unshield funds (spend shielded UTXOs as transparent output)', async () => {
    // First send shielded outputs to wallet2
    const sender = WalletHelper.getPrecalculatedWallet('shielded-unshield-sender');
    const receiver = WalletHelper.getPrecalculatedWallet('shielded-unshield-receiver');
    await WalletHelper.startMultipleWalletsForTest([sender, receiver]);

    try {
      await sender.injectFunds(1000, 0);

      const shieldedAddr0 = await receiver.getShieldedAddressAt(0);
      const shieldedAddr1 = await receiver.getShieldedAddressAt(1);

      // Shield funds to receiver
      await sender.sendTx({
        outputs: [
          { address: shieldedAddr0, value: 300, shielded: 1 },
          { address: shieldedAddr1, value: 200, shielded: 1 },
        ],
        destinationWallet: receiver.walletId,
      });

      // Now receiver unshields by sending transparent output back to sender
      const transparentAddr = await sender.getAddressAt(1);
      const unshieldTx = await receiver.sendTx({
        outputs: [
          { address: transparentAddr, value: 400 },
        ],
        destinationWallet: sender.walletId,
      });

      expect(unshieldTx.hash).toBeDefined();

      // Sender should have received 400 transparent
      const senderBalance = await sender.getBalance();
      expect(senderBalance.available).toBeGreaterThanOrEqual(400);
    } finally {
      await sender.stop();
      await receiver.stop();
    }
  });

  it('should chain shielded outputs (shielded-to-shielded)', async () => {
    const walletA = WalletHelper.getPrecalculatedWallet('shielded-chain-a');
    const walletB = WalletHelper.getPrecalculatedWallet('shielded-chain-b');
    const walletC = WalletHelper.getPrecalculatedWallet('shielded-chain-c');
    await WalletHelper.startMultipleWalletsForTest([walletA, walletB, walletC]);

    try {
      await walletA.injectFunds(1000, 0);

      // A → B (shielded)
      const shieldedAddrB0 = await walletB.getShieldedAddressAt(0);
      const shieldedAddrB1 = await walletB.getShieldedAddressAt(1);

      await walletA.sendTx({
        outputs: [
          { address: shieldedAddrB0, value: 300, shielded: 1 },
          { address: shieldedAddrB1, value: 200, shielded: 1 },
        ],
        destinationWallet: walletB.walletId,
      });

      // B → C (shielded-to-shielded, spending the shielded UTXOs from A)
      const shieldedAddrC0 = await walletC.getShieldedAddressAt(0);
      const shieldedAddrC1 = await walletC.getShieldedAddressAt(1);

      const chainTx = await walletB.sendTx({
        outputs: [
          { address: shieldedAddrC0, value: 200, shielded: 1 },
          { address: shieldedAddrC1, value: 100, shielded: 1 },
        ],
        destinationWallet: walletC.walletId,
      });

      expect(chainTx.hash).toBeDefined();

      // C should have received the shielded funds
      const balanceC = await walletC.getBalance();
      expect(balanceC.available).toBe(300);
    } finally {
      await walletA.stop();
      await walletB.stop();
      await walletC.stop();
    }
  });

  it('should send mixed AmountShielded and FullShielded in same transaction', async () => {
    const initialFunds = 1000;
    await wallet1.injectFunds(initialFunds, 5);

    const shieldedAddr0 = await wallet2.getShieldedAddressAt(9);
    const shieldedAddr1 = await wallet2.getShieldedAddressAt(10);

    const balanceBefore = await wallet1.getBalance();

    const tx = await wallet1.sendTx({
      outputs: [
        { address: shieldedAddr0, value: 200, shielded: 1 }, // AmountShielded
        { address: shieldedAddr1, value: 150, shielded: 2 }, // FullShielded
      ],
      destinationWallet: wallet2.walletId,
    });

    expect(tx.hash).toBeDefined();

    const balanceAfter = await wallet1.getBalance();
    const spent = balanceBefore.available - balanceAfter.available;
    // 350 (values) + 1 (AmountShielded fee) + 2 (FullShielded fee) = 353
    expect(spent).toBe(353);
  });

  it('should send shielded outputs with a custom token (AmountShielded)', async () => {
    const tokenSender = WalletHelper.getPrecalculatedWallet('shielded-token-sender');
    const tokenReceiver = WalletHelper.getPrecalculatedWallet('shielded-token-receiver');
    await WalletHelper.startMultipleWalletsForTest([tokenSender, tokenReceiver]);

    try {
      // Fund wallet for token creation (needs HTR for deposit + fees)
      await tokenSender.injectFunds(2000, 0);

      // Create custom token
      const tokenTx = await tokenSender.createToken({
        name: 'Shielded Test Token',
        symbol: 'STT',
        amount: 1000,
      });

      const tokenUid = tokenTx.hash;

      // Send custom token shielded
      const shieldedAddr0 = await tokenReceiver.getShieldedAddressAt(0);
      const shieldedAddr1 = await tokenReceiver.getShieldedAddressAt(1);

      const tx = await tokenSender.sendTx({
        outputs: [
          { address: shieldedAddr0, value: 300, token: tokenUid, shielded: 1 },
          { address: shieldedAddr1, value: 200, token: tokenUid, shielded: 1 },
        ],
        destinationWallet: tokenReceiver.walletId,
      });

      expect(tx.hash).toBeDefined();

      // Receiver should see the custom token balance
      const balanceR = await tokenReceiver.getBalance(tokenUid);
      expect(balanceR.available).toBe(500);
    } finally {
      await tokenSender.stop();
      await tokenReceiver.stop();
    }
  });

  it('should recover shielded balance after wallet restart', async () => {
    const restartSender = WalletHelper.getPrecalculatedWallet('shielded-restart-sender');
    const restartReceiver = WalletHelper.getPrecalculatedWallet('shielded-restart-receiver');
    await WalletHelper.startMultipleWalletsForTest([restartSender, restartReceiver]);

    try {
      await restartSender.injectFunds(1000, 0);

      const shieldedAddr0 = await restartReceiver.getShieldedAddressAt(0);
      const shieldedAddr1 = await restartReceiver.getShieldedAddressAt(1);

      await restartSender.sendTx({
        outputs: [
          { address: shieldedAddr0, value: 300, shielded: 1 },
          { address: shieldedAddr1, value: 200, shielded: 1 },
        ],
        destinationWallet: restartReceiver.walletId,
      });

      // Verify balance before restart
      const balanceBefore = await restartReceiver.getBalance();
      expect(balanceBefore.available).toBe(500);

      // Restart receiver wallet
      await restartReceiver.stop();
      await TestUtils.startWallet(restartReceiver.walletData, { waitWalletReady: true });

      // Balance should be recovered after restart
      const balanceAfter = await restartReceiver.getBalance();
      expect(balanceAfter.available).toBe(500);
    } finally {
      await restartSender.stop();
      await restartReceiver.stop();
    }
  });
});
