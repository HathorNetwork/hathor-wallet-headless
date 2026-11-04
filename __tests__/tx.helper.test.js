import { getUtxosToFillTx, prepareTxFunds } from '../src/helpers/tx.helper';

describe('test getUtxosToFillTx', () => {
  const fakeWallet = {
    getUtxos(_options) {
      return {
        utxos: [
          { amount: 1n },
          { amount: 2n },
          { amount: 3n },
        ],
      };
    }
  };

  it('should return expected utxos', async () => {
    const result1 = await getUtxosToFillTx(fakeWallet, 1n, {});
    expect(result1).toStrictEqual([{ amount: 1n }]);

    const result2 = await getUtxosToFillTx(fakeWallet, 2n, {});
    expect(result2).toStrictEqual([{ amount: 2n }]);

    const result3 = await getUtxosToFillTx(fakeWallet, 3n, {});
    expect(result3).toStrictEqual([{ amount: 3n }]);

    const result4 = await getUtxosToFillTx(fakeWallet, 4n, {});
    expect(result4).toStrictEqual([{ amount: 3n }, { amount: 2n }]);

    const result5 = await getUtxosToFillTx(fakeWallet, 5n, {});
    expect(result5).toStrictEqual([{ amount: 3n }, { amount: 2n }]);

    const result6 = await getUtxosToFillTx(fakeWallet, 6n, {});
    expect(result6).toStrictEqual([{ amount: 3n }, { amount: 2n }, { amount: 1n }]);

    const result7 = await getUtxosToFillTx(fakeWallet, 7n, {});
    expect(result7).toStrictEqual(null);
  });
});

describe('test prepareTxFunds query inputs', () => {
  function walletWithUtxos() {
    return {
      getUtxos: jest.fn(async () => ({
        total_amount_available: 10n,
        utxos: [{ tx_id: 'aa', index: 2, amount: 10n }],
      })),
    };
  }

  const outputs = () => [{ address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp', value: 5n }];

  it('should pass the documented filters to getUtxos', async () => {
    const wallet = walletWithUtxos();
    const result = await prepareTxFunds(wallet, outputs(), [{
      type: 'query',
      max_utxos: 3,
      filter_address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp',
      amount_smaller_than: 100n,
      amount_bigger_than: 1n,
      maximum_amount: 50n,
      shielded: true,
    }]);

    expect(result.success).toBe(true);
    expect(result.inputs).toEqual([{ txId: 'aa', index: 2 }]);
    expect(wallet.getUtxos).toHaveBeenCalledWith({
      max_utxos: 3,
      filter_address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp',
      amount_smaller_than: 100n,
      amount_bigger_than: 1n,
      max_amount: 50n,
      shielded: true,
      token: '00',
      only_available_utxos: true,
    });
  });

  it('should ignore query fields the API does not document', async () => {
    const wallet = walletWithUtxos();
    await prepareTxFunds(wallet, outputs(), [{
      type: 'query',
      authorities: 1n,
      order_by_value: 'asc',
      only_available_utxos: false,
    }]);

    expect(wallet.getUtxos).toHaveBeenCalledWith({ token: '00', only_available_utxos: true });
  });
});
