import { EventEmitter } from 'events';
import { transactionUtils } from '@hathor/wallet-lib';
import TestUtils from './test-utils';
import { stripShieldedSecrets } from '../src/helpers/shielded.helper';
import { notificationBus, WalletEventMap } from '../src/services/notification.service';

const { initializedWallets } = require('../src/services/wallets.service');

const walletId = 'stub_shielded_secrets';
const txId = '00000000000000000000000000000000000000000000000000000000000000aa';

/**
 * A history transaction with one owned shielded output, as wallet-lib 4.x
 * stores it: the decoded value and token plus the two blinding factors.
 */
function shieldedHistoryTx() {
  return {
    tx_id: txId,
    timestamp: 1000,
    inputs: [],
    outputs: [],
    shielded_outputs: [{
      mode: 1,
      script: 'dqkU',
      commitment: '08aa',
      range_proof: 'bb',
      decoded: { type: 'P2PKH', address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp' },
      value: 10n,
      token: '00',
      blindingFactor: '11'.repeat(32),
      assetBlindingFactor: '22'.repeat(32),
    }],
  };
}

function expectNoSecrets(output) {
  expect(output).not.toHaveProperty('blindingFactor');
  expect(output).not.toHaveProperty('assetBlindingFactor');
}

describe('stripShieldedSecrets', () => {
  it('removes the blinding factors and keeps the decoded value and token', () => {
    const tx = shieldedHistoryTx();
    const stripped = stripShieldedSecrets(tx);
    expectNoSecrets(stripped.shielded_outputs[0]);
    expect(stripped.shielded_outputs[0]).toMatchObject({
      value: 10n,
      token: '00',
      commitment: '08aa',
      decoded: { address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp' },
    });
    expect(stripped.tx_id).toBe(txId);
  });

  it('does not modify the stored transaction', () => {
    const tx = shieldedHistoryTx();
    stripShieldedSecrets(tx);
    expect(tx.shielded_outputs[0].blindingFactor).toBe('11'.repeat(32));
    expect(tx.shielded_outputs[0].assetBlindingFactor).toBe('22'.repeat(32));
  });

  it('returns transactions without shielded outputs unchanged', () => {
    const tx = { tx_id: txId, inputs: [], outputs: [] };
    expect(stripShieldedSecrets(tx)).toBe(tx);
    expect(stripShieldedSecrets(null)).toBe(null);
  });
});

describe('shielded secrets in the api', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /wallet/transaction does not return the blinding factors', async () => {
    const wallet = initializedWallets.get(walletId);
    jest.spyOn(wallet, 'getTx').mockResolvedValue(shieldedHistoryTx());

    const response = await TestUtils.request
      .get('/wallet/transaction')
      .query({ id: txId })
      .set({ 'x-wallet-id': walletId });

    expect(response.status).toBe(200);
    expect(response.body.tx_id).toBe(txId);
    expect(response.body.shielded_outputs).toHaveLength(1);
    expectNoSecrets(response.body.shielded_outputs[0]);
  });

  it('GET /wallet/tx-history does not return the blinding factors', async () => {
    const wallet = initializedWallets.get(walletId);
    jest.spyOn(wallet, 'getFullHistory').mockResolvedValue({ [txId]: shieldedHistoryTx() });

    for (const query of [{}, { limit: 1 }]) {
      const response = await TestUtils.request
        .get('/wallet/tx-history')
        .query(query)
        .set({ 'x-wallet-id': walletId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expectNoSecrets(response.body[0].shielded_outputs[0]);
    }
  });
});

describe('shielded secrets in wallet events', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['new-tx', 'update-tx'])('the %s event does not carry the blinding factors', async event => {
    jest.spyOn(transactionUtils, 'getTxBalance').mockResolvedValue({});
    const fakeWallet = new EventEmitter();
    fakeWallet.conn = new EventEmitter();
    fakeWallet.storage = {};
    notificationBus.subscribeHathorWallet('stub_events', fakeWallet);

    const emitted = new Promise(resolve => {
      notificationBus.once(WalletEventMap[event], resolve);
    });
    const tx = shieldedHistoryTx();
    fakeWallet.emit(event, tx);
    const data = await emitted;

    expectNoSecrets(data.data.shielded_outputs[0]);
    expect(data.data.shielded_outputs[0].value).toBe(10n);
    // The balance is still computed from the stored transaction
    expect(transactionUtils.getTxBalance).toHaveBeenCalledWith(tx, fakeWallet.storage);
  });
});
