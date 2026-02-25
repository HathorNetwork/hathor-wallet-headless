import fs from 'fs';
import { isEmpty } from 'lodash';
import { TestUtils } from '../utils/test-utils-integration';
import { HATHOR_TOKEN_ID } from '../configuration/test-constants';
import { WalletHelper } from '../utils/wallet-helper';
import { initializedWallets } from '../../../src/services/wallets.service';

/**
 * Fee Calculation Rules:
 * - Fee unit = 1 HTR
 * - Token output (fee-based) = 1 HTR per output
 * - Contract syscall (create_fee_token) = 1 HTR per call
 * - Deposit action = Acts as output, 1 HTR per deposit of fee-based token
 * - Withdraw action = Resulting outputs are charged
 * - Authority outputs (mint/melt) = Excluded from fee calculation
 */
describe('nano contract fee tokens', () => {
  let wallet;
  let address0;
  let blueprintId;
  let contractId;
  let feeTokenUid;

  // Helper to get wallet HTR balance
  const getWalletHtrBalance = async () => {
    const response = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: HATHOR_TOKEN_ID })
      .set({ 'x-wallet-id': wallet.walletId });
    return response.body.available;
  };

  // Helper to get contract HTR balance
  const getContractHtrBalance = async () => {
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({
        id: contractId,
        'balances[]': [HATHOR_TOKEN_ID],
      })
      .set({ 'x-wallet-id': wallet.walletId });
    return BigInt(response.body.state.balances[HATHOR_TOKEN_ID].value);
  };

  // Helper to check if a transaction is valid
  const checkTxValid = async (txId, walletObj) => {
    expect(txId).toBeDefined();
    await TestUtils.waitForTxReceived(walletObj.walletId, txId);
    await TestUtils.waitTxConfirmed(walletObj.walletId, txId);
    const libWalletObject = initializedWallets.get(walletObj.walletId);
    const txAfterExecution = await libWalletObject.getFullTxById(txId);
    expect(isEmpty(txAfterExecution.meta.voided_by)).toBe(true);
    expect(txAfterExecution.meta.first_block).not.toBeNull();
  };

  beforeAll(async () => {
    try {
      wallet = WalletHelper.getPrecalculatedWallet('nano-fee-1');
      await WalletHelper.startMultipleWalletsForTest([wallet]);
      await wallet.injectFunds(1000);
      address0 = await wallet.getAddressAt(0);

      // Create on-chain blueprint
      const code = fs.readFileSync(
        './__tests__/integration/configuration/blueprints/fee.py',
        'utf8'
      );
      const blueprintResponse = await TestUtils.request
        .post('/wallet/nano-contracts/create-on-chain-blueprint')
        .send({ code, address: address0 })
        .set({ 'x-wallet-id': wallet.walletId });

      expect(blueprintResponse.body.success).toBe(true);
      blueprintId = blueprintResponse.body.hash;
      await TestUtils.waitForTxReceived(wallet.walletId, blueprintId);
      await TestUtils.waitTxConfirmed(wallet.walletId, blueprintId);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet.stop();
  });

  it('should initialize a nano contract with FeeBlueprint with deposit token', async () => {
    // Get wallet balance before
    const walletHtrBefore = await getWalletHtrBalance();

    const depositAmount = 100;
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/create')
      .send({
        blueprint_id: blueprintId,
        address: address0,
        data: {
          actions: [
            {
              type: 'deposit',
              token: HATHOR_TOKEN_ID,
              amount: depositAmount,
            },
          ],
        },
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    contractId = response.body.hash;
    await checkTxValid(contractId, wallet);

    // Verify contract state
    const stateResponse = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({
        id: contractId,
        'balances[]': [HATHOR_TOKEN_ID],
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(stateResponse.body.success).toBe(true);
    const contractBalance = BigInt(stateResponse.body.state.balances[HATHOR_TOKEN_ID].value);
    expect(contractBalance).toBe(BigInt(depositAmount));

    // Assert HTR balance: No fee for HTR operations (HTR is not fee-based)
    // Wallet loses only the deposit amount
    const walletHtrAfter = await getWalletHtrBalance();
    expect(walletHtrBefore - walletHtrAfter).toBe(depositAmount);
  });

  it('should create a fee-based token via nano contract (version=2)', async () => {
    // Get balances before
    const walletHtrBefore = await getWalletHtrBalance();
    const contractHtrBefore = await getContractHtrBalance();

    const htrWithdrawal = 1;
    const tokenMintAmount = 1000;

    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'withdrawal',
              token: HATHOR_TOKEN_ID,
              amount: htrWithdrawal,
              address: address0,
            },
          ],
        },
        create_token_options: {
          name: 'Fee Test Token',
          symbol: 'FTT',
          amount: tokenMintAmount,
          mint_address: address0,
          contract_pays_deposit: true,
          version: 2, // FEE token
        },
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    feeTokenUid = response.body.hash;
    await checkTxValid(feeTokenUid, wallet);

    // Verify token was created
    const balanceResponse = await TestUtils.request
      .get('/wallet/balance')
      .query({ token: feeTokenUid })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(balanceResponse.body.available).toBe(tokenMintAmount);

    const expectedFee = 1;
    const walletHtrAfter = await getWalletHtrBalance();
    const contractHtrAfter = await getContractHtrBalance();

    // Contract loses the HTR withdrawal
    expect(contractHtrBefore - contractHtrAfter).toBe(BigInt(htrWithdrawal));

    // Wallet gains HTR withdrawal but pays fee
    // Net change = htrWithdrawal - expectedFee = 1 - 1 = 0
    expect(walletHtrAfter - walletHtrBefore).toBe(htrWithdrawal - expectedFee);
  });

  it('should fail when max_fee is exceeded', async () => {
    // This test requires a fee token withdrawal which triggers fee calculation
    // Setting max_fee to 0 should fail since any fee token operation requires > 0 fee
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'deposit',
              token: feeTokenUid,
              amount: 10,
              changeAddress: address0,
            },
          ],
        },
        max_fee: 0, // Should fail because depositing fee token requires fee > 0
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('exceeds maximum fee');
  });

  it('should deposit fee token into contract (paying fee in HTR)', async () => {
    // Get wallet HTR balance before
    const walletHtrBefore = await getWalletHtrBalance();

    const depositAmount = 100;

    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'deposit',
              token: feeTokenUid,
              amount: depositAmount,
              changeAddress: address0,
            },
          ],
        },
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    await checkTxValid(response.body.hash, wallet);

    // Verify contract received the fee tokens
    const stateResponse = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({
        id: contractId,
        'balances[]': [feeTokenUid],
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(stateResponse.body.success).toBe(true);
    const balance = BigInt(stateResponse.body.state.balances[feeTokenUid].value);
    expect(balance).toBe(BigInt(depositAmount));

    // Assert HTR balance:
    // Fee calculation for depositing fee-based token:
    // - Deposit action (100 FTT into contract) = 1 HTR (deposit acts as output)
    // - Change output (900 FTT back to wallet) = 1 HTR
    // Total fee = 2 HTR
    const expectedFee = 2;
    const walletHtrAfter = await getWalletHtrBalance();
    expect(walletHtrBefore - walletHtrAfter).toBe(expectedFee);
  });

  it('should withdraw fee token from contract (paying fee in HTR)', async () => {
    // Get wallet HTR balance before
    const walletHtrBefore = await getWalletHtrBalance();

    const withdrawAmount = 50;

    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'withdrawal',
              token: feeTokenUid,
              amount: withdrawAmount,
              address: address0,
            },
          ],
        },
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    await checkTxValid(response.body.hash, wallet);

    // Verify contract balance decreased
    const stateResponse = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({
        id: contractId,
        'balances[]': [feeTokenUid],
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(stateResponse.body.success).toBe(true);
    // Was 100, withdrew 50, should be 50
    expect(BigInt(stateResponse.body.state.balances[feeTokenUid].value)).toBe(50n);

    // Assert HTR balance:
    // Fee calculation for withdrawing fee-based token:
    // - Output (50 FTT to wallet) = 1 HTR
    // Total fee = 1 HTR
    const expectedFee = 1;
    const walletHtrAfter = await getWalletHtrBalance();
    expect(walletHtrBefore - walletHtrAfter).toBe(expectedFee);
  });

  it('should use contract_pays_fees option to deduct fee from HTR withdrawal', async () => {
    // Get wallet HTR balance before depositing
    const walletHtrBeforeDeposit = await getWalletHtrBalance();

    // First, deposit more HTR into the contract so it has balance to pay fees
    const htrDeposit = 50;
    const depositHtrResponse = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'deposit',
              token: HATHOR_TOKEN_ID,
              amount: htrDeposit,
            },
          ],
        },
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(depositHtrResponse.body.success).toBe(true);
    await checkTxValid(depositHtrResponse.body.hash, wallet);

    // Assert: HTR deposit has no fee (HTR is not fee-based)
    const walletHtrAfterDeposit = await getWalletHtrBalance();
    expect(walletHtrBeforeDeposit - walletHtrAfterDeposit).toBe(htrDeposit);

    // Get contract HTR balance before withdrawal
    const stateBefore = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({
        id: contractId,
        'balances[]': [HATHOR_TOKEN_ID, feeTokenUid],
      })
      .set({ 'x-wallet-id': wallet.walletId });

    const contractHtrBefore = BigInt(stateBefore.body.state.balances[HATHOR_TOKEN_ID].value);
    const walletHtrBeforeWithdraw = await getWalletHtrBalance();

    // Now withdraw fee token with contract_pays_fees=true
    // This means the fee should be deducted from HTR withdrawal output
    const fttWithdrawAmount = 10;
    const htrWithdrawal = 10;

    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'withdrawal',
              token: feeTokenUid,
              amount: fttWithdrawAmount,
              address: address0,
            },
            {
              type: 'withdrawal',
              token: HATHOR_TOKEN_ID,
              amount: htrWithdrawal,
              address: address0,
            },
          ],
        },
        contract_pays_fees: true,
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    await checkTxValid(response.body.hash, wallet);

    // Verify contract HTR balance decreased by withdrawal amount
    const stateAfter = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({
        id: contractId,
        'balances[]': [HATHOR_TOKEN_ID],
      })
      .set({ 'x-wallet-id': wallet.walletId });

    const contractHtrAfter = BigInt(stateAfter.body.state.balances[HATHOR_TOKEN_ID].value);
    // Contract balance should decrease by the full withdrawal amount
    expect(contractHtrBefore - contractHtrAfter).toBe(BigInt(htrWithdrawal));

    // Assert HTR balance with contract_pays_fees:
    // Fee calculation:
    // - Output (10 FTT to wallet) = 1 HTR
    // Total fee = 1 HTR (deducted from HTR withdrawal output)
    // Wallet receives: 10 HTR withdrawal - 1 HTR fee = 9 HTR net gain
    const expectedFee = 1;
    const walletHtrAfterWithdraw = await getWalletHtrBalance();
    expect(walletHtrAfterWithdraw - walletHtrBeforeWithdraw).toBe(htrWithdrawal - expectedFee);
  });

  it('should fail contract_pays_fees when HTR withdrawal is insufficient', async () => {
    // Try to withdraw fee token with contract_pays_fees but with 0 HTR withdrawal
    // This should fail because there's no HTR output to deduct fee from
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: contractId,
        method: 'noop',
        address: address0,
        data: {
          actions: [
            {
              type: 'withdrawal',
              token: feeTokenUid,
              amount: 10,
              address: address0,
            },
            // No HTR withdrawal - fee cannot be deducted
          ],
        },
        contract_pays_fees: true,
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('HTR output');
  });
}, 600 * 1000); // 10 minute timeout for all tests
