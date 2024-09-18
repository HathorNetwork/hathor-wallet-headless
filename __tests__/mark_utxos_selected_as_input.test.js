import { Storage, Transaction, Input, Output } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const walletId = 'stub_mark_inputs_as_used';

function createCustomTxHex() {
  const txId0 = '5db0a8c77f818c51cb107532fc1a36785adfa700d81d973fd1f23438b2f3dd74';
  const txId1 = 'fb2fbe0385bc0bc8e9a255a8d530f7b3bdcebcd5ccdae5e154e6c3d57cbcd143';
  const txId2 = '11835fae291c60fc58314c61d27dc644b9e029c363bbe458039b2b0186144275';
  const tx = new Transaction(
    [new Input(txId0, 0), new Input(txId1, 1), new Input(txId2, 2)],
    [new Output(100, Buffer.from('0463616665ac', 'hex'))],
    {
      timestamp: 123,
      parents: ['f6c83e3641a08ec21aebc01296ff12f5a46780f0fbadb1c8101309123b95d2c6'],
    },
  );

  return tx.toHex();
}

describe('mark utxos selected_as_input api', () => {
  let selectSpy;
  const txHex = createCustomTxHex();
  
  beforeAll(async () => {
    selectSpy = jest.spyOn(Storage.prototype, 'utxoSelectAsInput');
    await TestUtils.startWallet({ walletId });
  });

  beforeEach(() => {
    selectSpy.mockReset();
    selectSpy.mockImplementation(jest.fn(async () => {}));
  });

  afterAll(async () => {
    selectSpy.mockRestore();
    await TestUtils.stopWallet({ walletId });
  });

  it('should fail if txHex is not a hex string', async () => {
    let response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex: '0123g' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(selectSpy).toHaveBeenCalledTimes(0);
  });

  it('should fail if mark is not a boolean', async () => {
    let response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, mark_as_used: '123' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, mark_as_used: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, mark_as_used: 'abc' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if ttl is not a number', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, ttl: '123a' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if txHex is an invalid transaction', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex: '0123456789abcdef' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(selectSpy).toHaveBeenCalledTimes(0);
  });

  it('should mark the inputs as selected on the storage', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(selectSpy).toHaveBeenCalledTimes(3);
    expect(selectSpy).toHaveBeenCalledWith(
      { index: 0, txId: '5db0a8c77f818c51cb107532fc1a36785adfa700d81d973fd1f23438b2f3dd74'}, 
      true, 
      undefined,
    );
  });

  it('should mark the inputs as selected on the storage with ttl', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, ttl: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(selectSpy).toHaveBeenCalledTimes(3);
    expect(selectSpy).toHaveBeenCalledWith(
      { index: 0, txId: '5db0a8c77f818c51cb107532fc1a36785adfa700d81d973fd1f23438b2f3dd74'}, 
      true, 
      123,
    );
  });

  it('should mark the inputs as selected on the storage with mark false', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, mark_as_used: false })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(selectSpy).toHaveBeenCalledTimes(3);
    expect(selectSpy).toHaveBeenCalledWith(
      { index: 0, txId: '5db0a8c77f818c51cb107532fc1a36785adfa700d81d973fd1f23438b2f3dd74'}, 
      false, 
      undefined,
    );
  });

  it('should mark the inputs as selected on the storage with mark true', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, mark_as_used: true })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(selectSpy).toHaveBeenCalledTimes(3);
    expect(selectSpy).toHaveBeenCalledWith(
      { index: 0, txId: '5db0a8c77f818c51cb107532fc1a36785adfa700d81d973fd1f23438b2f3dd74'}, 
      true, 
      undefined,
    );
  });

  it('should mark the inputs as selected on the storage with all options', async () => {
    const response = await TestUtils.request
      .put('/wallet/utxos-selected-as-input')
      .send({ txHex, mark_as_used: false, ttl: 456 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(selectSpy).toHaveBeenCalledTimes(3);
    expect(selectSpy).toHaveBeenCalledWith(
      { index: 0, txId: '5db0a8c77f818c51cb107532fc1a36785adfa700d81d973fd1f23438b2f3dd74'}, 
      false, 
      456,
    );
  });
});
