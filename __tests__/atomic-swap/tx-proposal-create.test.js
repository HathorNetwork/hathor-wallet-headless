import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_create_tx_proposal';

describe('create tx-proposal api', () => {
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
  const spyApi = jest.spyOn(hathorLib.txApi, 'getTransaction');

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
    spyApi.mockImplementation(async (txId, cb) => {
      cb({
        success: true,
        tx: { outputs: [
          {
            txId: fakeTxId,
            index: 0,
            value: 10,
            token: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid,
            token_data: 0,
            decoded: { address: TestUtils.addresses[0] },
          },
        ] },
      });
    });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return 400 with an invalid body', async () => {
    const invalidArray = ['invalid'];

    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        inputs: invalidArray,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.anything(),
    }));

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        outputs: invalidArray,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.anything(),
    }));

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: invalidArray,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.anything(),
    }));

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive_tokens: invalidArray,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.anything(),
    }));

    // No body
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.anything(),
    }));

    // Invalid change address
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive_tokens: [{ token: '00', value: 10 }],
        change_address: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      error: expect.anything(),
    }));
  });

  it('should return 200 with receive_tokens', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive_tokens: [{ token: '00', value: 10 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: false,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(0);
    expect(tx.outputs).toHaveLength(1);
  });

  it('should return 200 with outputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        outputs: [{ token: '00', value: 10, address: TestUtils.addresses[2] }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: false,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(0);
    expect(tx.outputs).toHaveLength(1);
  });

  it('should return 200 with inputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        inputs: [{ txId: fakeTxId, index: 0 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: false,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(0);
  });

  it('should return 200 with send_tokens without change', async () => {
    const spyUtxos = jest.spyOn(hathorLib.HathorWallet.prototype, 'getUtxosForAmount').mockImplementation(() => ({
      changeAmount: 0,
      utxos: [
        { index: 0, txId: fakeTxId, value: 10, address: TestUtils.addresses[1], token: '00' },
      ]
    }));
    const spyHistory = jest.spyOn(hathorLib.HathorWallet.prototype, 'getFullHistory').mockImplementation(() => ({
      [fakeTxId]: { outputs: [{ token_data: 0 }] }
    }));
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ token: '00', value: 10 }], // value match inputsAmount, no change
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: false,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(0);

    // cleanup mock
    spyUtxos.mockRestore();
    spyHistory.mockRestore();
  });

  it('should return 200 with send_tokens with change', async () => {
    const spyUtxos = jest.spyOn(hathorLib.HathorWallet.prototype, 'getUtxosForAmount').mockImplementation(() => ({
      changeAmount: 9,
      utxos: [
        { index: 0, txId: fakeTxId, value: 10, address: TestUtils.addresses[1], token: '00' },
      ]
    }));
    const spyHistory = jest.spyOn(hathorLib.HathorWallet.prototype, 'getFullHistory').mockImplementation(() => ({
      [fakeTxId]: { outputs: [{ token_data: 0 }] }
    }));
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ value: 1 }], // value less than inputsAmount
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: false,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(1);

    // cleanup mock
    spyUtxos.mockRestore();
    spyHistory.mockRestore();
  });

  it('should return isComplete true if inputs match outputs', async () => {
    const spyUtxos = jest.spyOn(hathorLib.HathorWallet.prototype, 'getUtxosForAmount').mockImplementation(() => ({
      changeAmount: 5,
      utxos: [
        { index: 0, txId: fakeTxId, value: 10, address: TestUtils.addresses[1], token: '00' },
      ]
    }));
    const spyHistory = jest.spyOn(hathorLib.HathorWallet.prototype, 'getFullHistory').mockImplementation(() => ({
      [fakeTxId]: { outputs: [{ token_data: 0 }] }
    }));
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ value: 5 }],
        outputs: [{ value: 5, address: TestUtils.addresses[3] }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: true,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(2);

    // cleanup mock
    spyUtxos.mockRestore();
    spyHistory.mockRestore();
  });

  it('should be complete with custom tokens', async () => {
    const spyUtxos = jest.spyOn(hathorLib.HathorWallet.prototype, 'getUtxosForAmount').mockImplementation(() => ({
      changeAmount: 5,
      utxos: [
        { index: 1, txId: fakeTxId, value: 10, address: TestUtils.addresses[1], token: fakeUid },
      ]
    }));
    const spyHistory = jest.spyOn(hathorLib.HathorWallet.prototype, 'getFullHistory').mockImplementation(() => ({
      [fakeTxId]: { outputs: [{ token_data: 0 }, { token_data: 1 }] }
    }));

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send_tokens: [{ value: 5, token: fakeUid }],
        inputs: [{ index: 0, txId: fakeTxId }],
        outputs: [
          { value: 5, token: fakeUid, address: TestUtils.addresses[4] },
          { value: 10, address: TestUtils.addresses[5] },
        ],
      })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('atomic-swap[complete with custom tokens] response', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      isComplete: true,
      data: expect.any(String),
    }));

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(2); // 1 from send_tokens and another from inputs
    expect(tx.outputs).toHaveLength(3); // 2 intended and 1 change

    // cleanup mock
    spyUtxos.mockRestore();
    spyHistory.mockRestore();
  });
});
