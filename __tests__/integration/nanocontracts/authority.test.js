import fs from 'fs';
import { isEmpty } from 'lodash';
import { TestUtils } from '../utils/test-utils-integration';
import { HATHOR_TOKEN_ID } from '../configuration/test-constants';
import { WalletHelper } from '../utils/wallet-helper';
import { initializedWallets } from '../../../src/services/wallets.service';

describe('authority blueprint', () => {
  let walletNano; let
    address0;
  beforeAll(async () => {
    try {
      walletNano = WalletHelper.getPrecalculatedWallet('nano-authority');
      await WalletHelper.startMultipleWalletsForTest([walletNano]);
      await walletNano.injectFunds(1000);
      address0 = await walletNano.getAddressAt(0);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await walletNano.stop();
  });

  const checkTxValid = async (txId, wallet) => {
    expect(txId).toBeDefined();
    await TestUtils.waitForTxReceived(wallet.walletId, txId);
    // We need to wait for the tx to get a first block, so we guarantee it was executed
    await TestUtils.waitTxConfirmed(wallet.walletId, txId);
    // Now we query the transaction from the full node to double check it's still valid
    // after the nano execution and it already has a first block, so it was really executed
    const libWalletObject = initializedWallets.get(wallet.walletId);
    const txAfterExecution = await libWalletObject.getFullTxById(txId);
    expect(isEmpty(txAfterExecution.meta.voided_by)).toBe(true);
    expect(isEmpty(txAfterExecution.meta.first_block)).not.toBeNull();
  };

  const executeTests = async (wallet, blueprintId) => {
    const address1 = await wallet.getAddressAt(1);

    // Create NC with deposit of HTR
    const initializeData = {
      blueprint_id: blueprintId,
      address: address0,
      data: {
        actions: [
          {
            type: 'deposit',
            token: HATHOR_TOKEN_ID,
            amount: 100,
          },
        ],
      }
    };

    // Create NC
    const responseTx1 = await TestUtils.request
      .post('/wallet/nano-contracts/create')
      .send(initializeData)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTx1.status).toBe(200);
    expect(responseTx1.body.success).toBe(true);
    const tx1 = responseTx1.body;
    await checkTxValid(tx1.hash, wallet);

    // Create token and execute nano method with withdrawal action
    // this withdrawal will be used to pay for the deposit fee (10n and 20n for an output)
    const createTokenOptions = {
      mint_address: address0,
      name: 'Authority Test Token',
      symbol: 'ATT',
      amount: 1000,
      create_mint: true,
      create_melt: true,
      is_create_nft: false,
      contract_pays_deposit: true,
    };

    const createTokenData = {
      nc_id: tx1.hash,
      method: 'create_token',
      address: address1,
      data: {
        actions: [
          {
            type: 'withdrawal',
            token: HATHOR_TOKEN_ID,
            amount: 30,
            address: address1,
          },
        ],
      },
      create_token_options: createTokenOptions
    };

    const responseTxCreateToken = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(createTokenData)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxCreateToken.status).toBe(200);
    expect(responseTxCreateToken.body.success).toBe(true);
    const txCreateToken = responseTxCreateToken.body;
    await checkTxValid(txCreateToken.hash, wallet);

    // Get NC state
    const responseState1 = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncState1 = responseState1.body.state;

    // Deposit 100 - Withdrawal 30 of HTR
    // 0 tokens of new created token
    // Contract state
    expect(BigInt(ncState1.balances[HATHOR_TOKEN_ID].value)).toBe(70n);
    expect(BigInt(ncState1.balances[txCreateToken.hash].value)).toBe(0n);
    expect(ncState1.balances[txCreateToken.hash].can_mint).toBe(false);
    expect(ncState1.balances[txCreateToken.hash].can_melt).toBe(false);

    // We will grant a mint authority to the contract
    const grantData1 = {
      nc_id: tx1.hash,
      method: 'grant_authority',
      address: address0,
      data: {
        actions: [
          {
            type: 'grant_authority',
            token: txCreateToken.hash,
            authority: 'mint',
          },
        ]
      }
    };

    const responseTxGrant1 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(grantData1)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxGrant1.status).toBe(200);
    expect(responseTxGrant1.body.success).toBe(true);
    const txGrant1 = responseTxGrant1.body;
    await checkTxValid(txGrant1.hash, wallet);

    const responseStateGrant1 = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncStateGrant1 = responseStateGrant1.body.state;

    expect(BigInt(ncStateGrant1.balances[txCreateToken.hash].value)).toBe(0n);
    expect(ncStateGrant1.balances[txCreateToken.hash].can_mint).toBe(true);
    expect(ncStateGrant1.balances[txCreateToken.hash].can_melt).toBe(false);

    // We will grant a melt authority to the contract and keep one to the wallet
    const grantData2 = {
      nc_id: tx1.hash,
      method: 'grant_authority',
      address: address0,
      data: {
        actions: [
          {
            type: 'grant_authority',
            token: txCreateToken.hash,
            authority: 'melt',
            authorityAddress: address1,
          },
        ]
      }
    };

    const responseTxGrant2 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(grantData2)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxGrant2.status).toBe(200);
    expect(responseTxGrant2.body.success).toBe(true);
    const txGrant2 = responseTxGrant2.body;
    await checkTxValid(txGrant2.hash, wallet);

    const responseStateGrant2 = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncStateGrant2 = responseStateGrant2.body.state;

    expect(BigInt(ncStateGrant2.balances[txCreateToken.hash].value)).toBe(0n);
    expect(ncStateGrant2.balances[txCreateToken.hash].can_mint).toBe(true);
    expect(ncStateGrant2.balances[txCreateToken.hash].can_melt).toBe(true);

    // Mint 2000 tokens in the contract
    const mintData = {
      nc_id: tx1.hash,
      method: 'mint',
      address: address0,
      data: {
        args: [txCreateToken.hash, 2000]
      }
    };
    const responseTxMint = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(mintData)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxMint.status).toBe(200);
    expect(responseTxMint.body.success).toBe(true);
    const txMint = responseTxMint.body;
    await checkTxValid(txMint.hash, wallet);

    const responseStateMint = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncStateMint = responseStateMint.body.state;

    expect(BigInt(ncStateMint.balances[HATHOR_TOKEN_ID].value)).toBe(50n);
    expect(BigInt(ncStateMint.balances[txCreateToken.hash].value)).toBe(2000n);
    expect(ncStateMint.balances[txCreateToken.hash].can_mint).toBe(true);
    expect(ncStateMint.balances[txCreateToken.hash].can_melt).toBe(true);

    // Melt 1000 tokens in the contract
    const meltData = {
      nc_id: tx1.hash,
      method: 'melt',
      address: address0,
      data: {
        args: [txCreateToken.hash, 1000]
      }
    };

    const responseTxMelt = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(meltData)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxMelt.status).toBe(200);
    expect(responseTxMelt.body.success).toBe(true);
    const txMelt = responseTxMelt.body;
    await checkTxValid(txMelt.hash, wallet);

    const responseStateMelt = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncStateMelt = responseStateMelt.body.state;

    expect(BigInt(ncStateMelt.balances[HATHOR_TOKEN_ID].value)).toBe(60n);
    expect(BigInt(ncStateMelt.balances[txCreateToken.hash].value)).toBe(1000n);
    expect(ncStateMelt.balances[txCreateToken.hash].can_mint).toBe(true);
    expect(ncStateMelt.balances[txCreateToken.hash].can_melt).toBe(true);

    // We will acquire a mint authority to an output
    const acquireData = {
      nc_id: tx1.hash,
      method: 'acquire_authority',
      address: address0,
      data: {
        actions: [
          {
            type: 'acquire_authority',
            token: txCreateToken.hash,
            authority: 'mint',
            address: address1,
          },
        ],
      }
    };

    const responseTxAcquire = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(acquireData)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxAcquire.status).toBe(200);
    expect(responseTxAcquire.body.success).toBe(true);
    const txAcquire = responseTxAcquire.body;
    await checkTxValid(txAcquire.hash, wallet);

    const responseStateAcquire = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncStateAcquire = responseStateAcquire.body.state;

    expect(BigInt(ncStateAcquire.balances[HATHOR_TOKEN_ID].value)).toBe(60n);
    expect(BigInt(ncStateAcquire.balances[txCreateToken.hash].value)).toBe(1000n);
    expect(ncStateAcquire.balances[txCreateToken.hash].can_mint).toBe(true);
    expect(ncStateAcquire.balances[txCreateToken.hash].can_melt).toBe(true);

    // Revoke authorities of mint and melt from the contract
    const revokeData = {
      nc_id: tx1.hash,
      method: 'revoke',
      address: address0,
      data: {
        args: [txCreateToken.hash, true, true],
      }
    };

    const responseTxRevoke = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send(revokeData)
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTxRevoke.status).toBe(200);
    expect(responseTxRevoke.body.success).toBe(true);
    const txRevoke = responseTxRevoke.body;
    await checkTxValid(txRevoke.hash, wallet);

    const responseStateRevoke = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [],
        balances: [txCreateToken.hash, HATHOR_TOKEN_ID], })
      .set({ 'x-wallet-id': wallet.walletId });

    const ncStateRevoke = responseStateRevoke.body.state;

    expect(BigInt(ncStateRevoke.balances[HATHOR_TOKEN_ID].value)).toBe(60n);
    expect(BigInt(ncStateRevoke.balances[txCreateToken.hash].value)).toBe(1000n);
    expect(ncStateRevoke.balances[txCreateToken.hash].can_mint).toBe(false);
    expect(ncStateRevoke.balances[txCreateToken.hash].can_melt).toBe(false);
  };

  it('on chain bet methods', async () => {
    // Use the authority blueprint code
    const code = fs.readFileSync('./__tests__/integration/configuration/blueprints/authority.py', 'utf8');

    // Create the blueprint
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/create-on-chain-blueprint')
      .send({ code, address: address0 })
      .set({ 'x-wallet-id': walletNano.walletId });
    const ocbHash = response.body.hash;
    // Wait for the tx to be confirmed, so we can use the on chain blueprint
    await TestUtils.waitForTxReceived(walletNano.walletId, ocbHash);
    await TestUtils.waitTxConfirmed(walletNano.walletId, ocbHash);
    // Execute the tests
    await executeTests(walletNano, ocbHash);
  });
});
