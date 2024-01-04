import TestUtils from './test-utils';
import { WALLET_CONSTANTS } from './integration/configuration/test-constants';
import { initializedWallets } from '../src/services/wallets.service';

const walletId = 'stub_wallet_start';

describe('index-limit config api', () => {
  beforeEach(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('load more addresses', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      scanPolicy: 'index-limit',
    };

    let response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    expect(response.body).toHaveProperty('success', true);
    await TestUtils.waitReady({ walletId });

    // Check that the wallet actually used the given gap-limit
    const wallet = initializedWallets.get(walletId);
    await expect(wallet.storage.getScanningPolicy()).resolves.toBe('index-limit');
    await expect(wallet.storage.getIndexLimit()).resolves.toMatchObject({
      startIndex: 0,
      endIndex: 0,
    });
    await expect(wallet.storage.store.addressCount()).resolves.toBe(1);

    response = await TestUtils.request
      .post('/wallet/config/index-limit/load-more-addresses')
      .send({ count: 4 })
      .set({ 'x-wallet-id': walletId });
    await expect(wallet.storage.getIndexLimit()).resolves.toMatchObject({
      startIndex: 0,
      endIndex: 4,
    });
    await expect(wallet.storage.store.addressCount()).resolves.toBe(5);
  });
  it('set last index', async () => {
    const walletHttpInput = {
      'wallet-id': walletId,
      seed: WALLET_CONSTANTS.genesis.words,
      scanPolicy: 'index-limit',
      policyStartIndex: 5,
      policyEndIndex: 10,
    };

    let response = await TestUtils.request
      .post('/start')
      .send(walletHttpInput);

    expect(response.body).toHaveProperty('success', true);
    await TestUtils.waitReady({ walletId });

    // Check that the wallet actually used the given gap-limit
    const wallet = initializedWallets.get(walletId);
    await expect(wallet.storage.getScanningPolicy()).resolves.toBe('index-limit');
    await expect(wallet.storage.getIndexLimit()).resolves.toMatchObject({
      startIndex: 5,
      endIndex: 10,
    });
    await expect(wallet.storage.store.addressCount()).resolves.toBe(6);

    response = await TestUtils.request
      .post('/wallet/config/index-limit/last-index')
      .send({ index: 14 })
      .set({ 'x-wallet-id': walletId });
    await expect(wallet.storage.getIndexLimit()).resolves.toMatchObject({
      startIndex: 5,
      endIndex: 14,
    });
    await expect(wallet.storage.store.addressCount()).resolves.toBe(10);
  });
});
