import { Address, P2PKH, bufferUtils } from '@hathor/wallet-lib';
import { isEmpty } from 'lodash';
import { TestUtils } from './utils/test-utils-integration';
import { HATHOR_TOKEN_ID } from './configuration/test-constants';
import { WalletHelper } from './utils/wallet-helper';
import { initializedWallets } from '../../src/services/wallets.service';

describe('nano contract routes', () => {
  let wallet;
  let libWalletObject;

  beforeAll(async () => {
    try {
      // A random HTR value for the first wallet
      wallet = WalletHelper.getPrecalculatedWallet('nano-contracts');
      await WalletHelper.startMultipleWalletsForTest([wallet]);
      libWalletObject = initializedWallets.get(wallet.walletId);
      await wallet.injectFunds(1000);
    } catch (err) {
      TestUtils.logError(err.stack);
    }
  });

  afterAll(async () => {
    await wallet.stop();
  });

  const checkTxValid = async txId => {
    expect(txId).toBeDefined();
    await TestUtils.waitForTxReceived(wallet.walletId, txId);
    // We need to wait for the tx to get a first block, so we guarantee it was executed
    await TestUtils.waitTxConfirmed(wallet.walletId, txId);
    // Now we query the transaction from the full node to double check it's still valid
    // after the nano execution and it already has a first block, so it was really executed
    const txAfterExecution = await libWalletObject.getFullTxById(txId);
    expect(isEmpty(txAfterExecution.meta.voided_by)).toBe(true);
    expect(isEmpty(txAfterExecution.meta.first_block)).not.toBeNull();
  };

  it('bet methods', async () => {
    const address0 = await wallet.getAddressAt(0);
    const address1 = await wallet.getAddressAt(1);
    const dateLastBet = parseInt(Date.now().valueOf() / 1000, 10) + 6000; // Now + 6000 seconds
    const network = libWalletObject.getNetworkObject();
    const blueprintId = '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595';

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
    await checkTxValid(tx1.hash);

    // Bet 100 to address 2
    const address2 = await wallet.getAddressAt(2);
    const address2Obj = new Address(address2, { network });
    const responseBet = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: tx1.hash,
        address: address2,
        method: 'bet',
        data: {
          args: [
            bufferUtils.bufferToHex(address2Obj.decode()),
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
    await checkTxValid(txBet.hash);

    // Bet 200 to address 3
    const address3 = await wallet.getAddressAt(3);
    const address3Obj = new Address(address3, { network });
    const responseBet2 = await TestUtils.request
      .post('/wallet/nano-contracts/execute')
      .send({
        nc_id: tx1.hash,
        address: address3,
        method: 'bet',
        data: {
          args: [
            bufferUtils.bufferToHex(address3Obj.decode()),
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
    await checkTxValid(txBet2.hash);

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
          'date_last_offer',
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
    expect(ncState.fields.date_last_offer.value).toBe(dateLastBet);
    expect(ncState.fields.oracle_script.value).toBe(bufferUtils.bufferToHex(outputScriptBuffer1));
    expect(ncState.fields.final_result.value).toBeNull();
    expect(ncState.fields.total.value).toBe(300);
    expect(ncState.fields[`address_details.a'${address2}'`].value).toHaveProperty('1x0', 100);
    expect(ncState.fields[`withdrawals.a'${address2}'`].value).toBeUndefined();
    expect(ncState.fields[`address_details.a'${address3}'`].value).toHaveProperty('2x0', 200);
    expect(ncState.fields[`withdrawals.a'${address3}'`].value).toBeUndefined();

    // Set result to '1x0'
    const responseOracleSignedResult = await TestUtils.request
      .get('/wallet/nano-contracts/oracle-signed-result')
      .query({ oracle_data: oracleData, result: '1x0', type: 'str' })
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
    await checkTxValid(txSetResult.hash);
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
    await checkTxValid(txWithdrawal.hash);
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
          'date_last_offer',
          `address_details.a'${address2}'`,
          `withdrawals.a'${address2}'`,
          `address_details.a'${address3}'`,
          `withdrawals.a'${address3}'`
        ] })
      .set({ 'x-wallet-id': wallet.walletId });
    const ncState2 = responseState2.body.state;
    expect(ncState2.fields.token_uid.value).toBe(HATHOR_TOKEN_ID);
    expect(ncState2.fields.date_last_offer.value).toBe(dateLastBet);
    expect(ncState2.fields.oracle_script.value).toBe(bufferUtils.bufferToHex(outputScriptBuffer1));
    expect(ncState2.fields.final_result.value).toBe('1x0');
    expect(ncState2.fields.total.value).toBe(300);
    expect(ncState2.fields[`address_details.a'${address2}'`].value).toHaveProperty('1x0', 100);
    expect(ncState2.fields[`withdrawals.a'${address2}'`].value).toBe(300);
    expect(ncState2.fields[`address_details.a'${address3}'`].value).toHaveProperty('2x0', 200);
    expect(ncState2.fields[`withdrawals.a'${address3}'`].value).toBeUndefined();

    // Get history again
    const responseHistory2 = await TestUtils.request
      .get('/wallet/nano-contracts/history')
      .query({ id: tx1.hash })
      .set({ 'x-wallet-id': wallet.walletId });
    expect(responseHistory2.body.history.length).toBe(5);
    for (const tx of responseHistory2.body.history) {
      expect(txIds).toContain(tx.hash);
    }
  });
});
