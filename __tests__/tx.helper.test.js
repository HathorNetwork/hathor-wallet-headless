import { getUtxosToFillTx } from '../src/helpers/tx.helper';

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
