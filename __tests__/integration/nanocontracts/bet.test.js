import fs from 'fs';
import { Address, P2PKH, bufferUtils } from '@hathor/wallet-lib';
import { isEmpty } from 'lodash';
import { TestUtils } from '../utils/test-utils-integration';
import { HATHOR_TOKEN_ID, WALLET_CONSTANTS } from '../configuration/test-constants';
import { WalletHelper } from '../utils/wallet-helper';
import { initializedWallets } from '../../../src/services/wallets.service';

describe('nano contract routes', () => {
  let walletNano;
  const builtInBlueprintId = '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595';

  beforeAll(async () => {
    try {
      // A random HTR value for the first wallet
      walletNano = WalletHelper.getPrecalculatedWallet('nano-contracts');
      await WalletHelper.startMultipleWalletsForTest([walletNano]);
      await walletNano.injectFunds(1000);
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
    const address0 = await wallet.getAddressAt(0);
    const address1 = await wallet.getAddressAt(1);
    const dateLastBet = parseInt(Date.now().valueOf() / 1000, 10) + 6000; // Now + 6000 seconds
    const libWalletObject = initializedWallets.get(wallet.walletId);
    const network = libWalletObject.getNetworkObject();

    // Create NC
    const response = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-data')
      .query({ oracle: address1 })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Oracle data in hex
    const { oracleData } = response.body;

    const responseTx1 = await TestUtils.request
      .post('/wallet/nano-contracts/create')
      .send({
        blueprint_id: blueprintId,
        address: address0,
        data: {
          args: [
            oracleData,
            HATHOR_TOKEN_ID,
            dateLastBet
          ]
        }
      })
      .set({ 'x-wallet-id': wallet.walletId });

    expect(responseTx1.status).toBe(200);
    expect(responseTx1.body.success).toBe(true);
    const tx1 = responseTx1.body;
    await checkTxValid(tx1.hash, wallet);

    // Bet 100 to address 2
    const address2 = await wallet.getAddressAt(2);
    const responseBet = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: tx1.hash,
        address: address2,
        method: 'bet',
        data: {
          args: [
            address2,
            '1x0'
          ],
          actions: [
            {
              type: 'deposit',
              token: HATHOR_TOKEN_ID,
              amount: 100
            }
          ],
        }
      })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseBet.status).toBe(200);
    expect(responseBet.body.success).toBe(true);
    const txBet = responseBet.body;
    await checkTxValid(txBet.hash, wallet);

    // Bet 200 to address 3
    const address3 = await wallet.getAddressAt(3);
    const responseBet2 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: tx1.hash,
        address: address3,
        method: 'bet',
        data: {
          args: [
            address3,
            '2x0'
          ],
          actions: [
            {
              type: 'deposit',
              token: HATHOR_TOKEN_ID,
              amount: 200
            }
          ],
        }
      })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseBet2.status).toBe(200);
    expect(responseBet2.body.success).toBe(true);
    const txBet2 = responseBet2.body;
    await checkTxValid(txBet2.hash, wallet);

    // Get nc history
    const txIds = [tx1.hash, txBet.hash, txBet2.hash];
    const responseHistory = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: tx1.hash })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseHistory.body.history.length).toBe(3);
    for (const tx of responseHistory.body.history) {
      expect(txIds).toContain(tx.hash);
    }

    // Get NC state
    const responseState = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [
          'token_uid',
          'total',
          'final_result',
          'oracle_script',
          'date_last_bet',
          `address_details.a'${address2}'`,
          `withdrawals.a'${address2}'`,
          `address_details.a'${address3}'`,
          `withdrawals.a'${address3}'`
        ] })
      .set({ 'x-wallet-id': wallet.walletId });
    const ncState = responseState.body.state;
    const addressObj1 = new Address(address1, { network });
    const outputScriptObj1 = new P2PKH(addressObj1);
    const outputScriptBuffer1 = outputScriptObj1.createScript();

    expect(ncState.fields.token_uid.value).toBe(HATHOR_TOKEN_ID);
    expect(ncState.fields.date_last_bet.value).toBe(dateLastBet);
    expect(ncState.fields.oracle_script.value).toBe(bufferUtils.bufferToHex(outputScriptBuffer1));
    expect(ncState.fields.final_result.value).toBeNull();
    expect(ncState.fields.total.value).toBe(300);
    /*
    expect(ncState.fields[`address_details.a'${address2}'`].value).toHaveProperty('1x0', 100);
    expect(ncState.fields[`withdrawals.a'${address2}'`].value).toBeUndefined();
    expect(ncState.fields[`address_details.a'${address3}'`].value).toHaveProperty('2x0', 200);
    expect(ncState.fields[`withdrawals.a'${address3}'`].value).toBeUndefined();
    */

    // Set result to '1x0'
    const responseOracleSignedResult = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-signed-result')
      .query({ oracle_data: oracleData, contract_id: tx1.hash, result: '1x0', type: 'str' })
      .set({ 'x-wallet-id': wallet.walletId });

    const responseSetResult = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: tx1.hash,
        address: address1,
        method: 'set_result',
        data: {
          args: [
            responseOracleSignedResult.body.signedResult
          ],
        }
      })
      .set({ 'x-wallet-id': wallet.walletId });
    const txSetResult = responseSetResult.body;
    await checkTxValid(txSetResult.hash, wallet);
    txIds.push(txSetResult.hash);

    // Try to withdraw to address 2, success
    const responseWithdrawal = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: tx1.hash,
        address: address2,
        method: 'withdraw',
        data: {
          actions: [
            {
              type: 'withdrawal',
              token: HATHOR_TOKEN_ID,
              amount: 300,
              address: address2
            }
          ],
        }
      })
      .set({ 'x-wallet-id': wallet.walletId });
    const txWithdrawal = responseWithdrawal.body;
    await checkTxValid(txWithdrawal.hash, wallet);
    txIds.push(txWithdrawal.hash);

    // Get state again
    const responseState2 = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [
          'token_uid',
          'total',
          'final_result',
          'oracle_script',
          'date_last_bet',
          `address_details.a'${address2}'`,
          `withdrawals.a'${address2}'`,
          `address_details.a'${address3}'`,
          `withdrawals.a'${address3}'`
        ] })
      .set({ 'x-wallet-id': wallet.walletId });
    const ncState2 = responseState2.body.state;
    expect(ncState2.fields.token_uid.value).toBe(HATHOR_TOKEN_ID);
    expect(ncState2.fields.date_last_bet.value).toBe(dateLastBet);
    expect(ncState2.fields.oracle_script.value).toBe(bufferUtils.bufferToHex(outputScriptBuffer1));
    expect(ncState2.fields.final_result.value).toBe('1x0');
    expect(ncState2.fields.total.value).toBe(300);
    /*
    expect(ncState2.fields[`address_details.a'${address2}'`].value).toHaveProperty('1x0', 100);
    expect(ncState2.fields[`withdrawals.a'${address2}'`].value).toBe(300);
    expect(ncState2.fields[`address_details.a'${address3}'`].value).toHaveProperty('2x0', 200);
    expect(ncState2.fields[`withdrawals.a'${address3}'`].value).toBeUndefined();
    */

    // Get history again
    const responseHistory2 = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: tx1.hash })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseHistory2.body.history.length).toBe(5);
    for (const tx of responseHistory2.body.history) {
      expect(txIds).toContain(tx.hash);
    }

    // Get state in an old block hash, after the second bet
    const responseStateOld = await TestUtils.request
      .get('/wallet/nano-contracts/state')
      .query({ id: tx1.hash,
        fields: [
          'token_uid',
          'total',
          'final_result',
          'oracle_script',
          'date_last_bet',
          `address_details.a'${address2}'`,
          `withdrawals.a'${address2}'`,
          `address_details.a'${address3}'`,
          `withdrawals.a'${address3}'`
        ],
        block_hash: responseHistory2.body.history[2].first_block })
      .set({ 'x-wallet-id': wallet.walletId });
    const ncStateOld = responseStateOld.body.state;
    expect(ncStateOld.fields.token_uid.value).toBe(HATHOR_TOKEN_ID);
    expect(ncStateOld.fields.date_last_bet.value).toBe(dateLastBet);
    expect(ncStateOld.fields.oracle_script.value).toBe(
      bufferUtils.bufferToHex(outputScriptBuffer1)
    );
    expect(ncStateOld.fields.final_result.value).toBeNull();
    expect(ncStateOld.fields.total.value).toBe(300);
    /*
    expect(ncStateOld.fields[`address_details.a'${address2}'`].value).toHaveProperty('1x0', 100);
    expect(ncStateOld.fields[`withdrawals.a'${address2}'`].value).toBeUndefined();
    expect(ncStateOld.fields[`address_details.a'${address3}'`].value).toHaveProperty('2x0', 200);
    expect(ncStateOld.fields[`withdrawals.a'${address3}'`].value).toBeUndefined();
    */

    // Now we will test the history with pagination
    const history2 = responseHistory2.body.history;

    // Get history with count 2
    const responseHistory3 = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: tx1.hash, count: 2 })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseHistory3.body.history.length).toBe(2);
    expect(responseHistory3.body.history).toStrictEqual([history2[0], history2[1]]);

    // Now the next page with after
    const responseHistory4 = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: tx1.hash, count: 2, after: responseHistory3.body.history[1].hash })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseHistory4.body.history.length).toBe(2);
    expect(responseHistory4.body.history).toStrictEqual([history2[2], history2[3]]);

    // Now the previous page with before
    const responseHistory5 = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: tx1.hash, count: 2, before: responseHistory4.body.history[0].hash })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseHistory5.body.history.length).toBe(2);
    // When using before, the order comes reverted
    expect(responseHistory5.body.history).toStrictEqual([history2[1], history2[0]]);
  };

  it('built in bet methods', async () => {
    await executeTests(walletNano, builtInBlueprintId);
  });

  it('on chain bet methods', async () => {
    // For now the on chain blueprints needs a signature from a specific address
    // so we must always generate the same seed
    const { seed } = WALLET_CONSTANTS.ocb;
    const ocbWallet = new WalletHelper('ocb-wallet', { words: seed });
    await WalletHelper.startMultipleWalletsForTest([ocbWallet]);
    const libOcbWalletObject = initializedWallets.get(ocbWallet.walletId);
    await ocbWallet.injectFunds(1000);
    // We use the address10 as caller of the ocb tx
    // so we don't mess with the number of transactions for address0 tests
    const address10 = await libOcbWalletObject.getAddressAtIndex(10);

    // Use the bet blueprint code
    const code = fs.readFileSync('./__tests__/integration/configuration/blueprints/bet.py', 'utf8');

    // First we will have a test case for an error when calling the lib method
    // when running with an invalid address
    const responseError = await TestUtils.request
      .post('/wallet/nano-contracts/create-on-chain-blueprint')
      .send({ code, address: '123' })
      .set({ 'x-wallet-id': ocbWallet.walletId });

    expect(responseError.body.success).toBe(false);

    // Now success
    const response = await TestUtils.request
      .post('/wallet/nano-contracts/create-on-chain-blueprint')
      .send({ code, address: address10 })
      .set({ 'x-wallet-id': ocbWallet.walletId });
    const ocbHash = response.body.hash;
    // Wait for the tx to be confirmed, so we can use the on chain blueprint
    await TestUtils.waitForTxReceived(ocbWallet.walletId, ocbHash);
    await TestUtils.waitTxConfirmed(ocbWallet.walletId, ocbHash);
    // We must have one transaction in the address10 now
    const address10Meta = await libOcbWalletObject.storage.store.getAddressMeta(address10);
    expect(address10Meta.numTransactions).toBe(1);
    // Execute the bet blueprint tests
    await executeTests(ocbWallet, ocbHash);
  });
});
