import hathorLib from '@hathor/wallet-lib';
import TestUtils from '../test-utils';

const walletId = 'stub_atomic_swap_create_tx_proposal';

describe('create tx-proposal api', () => {
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
  const spyApi = jest.spyOn(hathorLib.txApi, 'getTransaction');
  const spyUtxos = jest.spyOn(hathorLib.PartialTxProposal, 'getWalletUtxos');

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
    spyApi.mockImplementation(async (txId, cb) => {
      cb({
        success: true,
        tx: {
          tokens: [{ uid: fakeUid }],
          outputs: [
            {
              value: 10,
              token: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid,
              token_data: 0,
              decoded: { address: TestUtils.addresses[0] },
            },
            {
              value: 10,
              token: fakeUid,
              token_data: 1,
              decoded: { address: TestUtils.addresses[1] },
            },
          ]
        },
      });
    });
    spyUtxos.mockImplementation((hwallet, token) => ([{
      txId: fakeTxId,
      index: 0,
      tokenId: hathorLib.constants.HATHOR_TOKEN_CONFIG.uid,
      value: 10,
      address: TestUtils.addresses[0],
      timelock: null,
      locked: false,
      authorities: 0,
      heightlock: null,
      addressPath: 'm/fake/bip32/path',
      tokenData: 0,
    }]));
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
    spyApi.mockRestore();
    spyUtxos.mockRestore();
  });

  it('should return 400 with an invalid body', async () => {
    const invalidArray = ['invalid'];

    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: invalidArray,
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: expect.anything(),
    });

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive: {
          tokens: invalidArray,
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: expect.anything(),
    });

    // No body
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: expect.anything(),
    });

    // Invalid change address
    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive: {
          tokens: [{ token: '00', value: 10 }]
        },
        change_address: 1,
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: expect.anything(),
    });
  });

  it('should return 200 with receive.tokens', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        receive: {
          tokens: [{ token: '00', value: 10 }],
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      isComplete: false,
      data: expect.any(String),
    });

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(0);
    expect(tx.outputs).toHaveLength(1);
  });

  it('should return 200 with send.tokens without change', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ token: '00', value: 10 }], // value match inputsAmount, so no change
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      isComplete: false,
      data: expect.any(String),
    });

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(0);
  });

  it('should return 200 with send.tokens with change', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ value: 1 }], // value less than inputsAmount
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      isComplete: false,
      data: expect.any(String),
    });

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(1);
  });

  it('should return isComplete true if inputs match outputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [{ value: 5 }],
        },
        receive: {
          tokens: [{ value: 5, address: TestUtils.addresses[3] }],
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      isComplete: true,
      data: expect.any(String),
    });

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(1);
    expect(tx.outputs).toHaveLength(2);
  });

  it('should be complete with custom tokens', async () => {
    // Mock tokenUid utxos
    spyUtxos.mockImplementationOnce((hwallet, token) => ([{
      txId: fakeTxId,
      index: 1,
      tokenId: fakeUid,
      value: 10,
      address: TestUtils.addresses[0],
      timelock: null,
      locked: false,
      authorities: 0,
      heightlock: null,
      addressPath: 'm/fake/bip32/path',
      tokenData: 0,
    }]));
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            { value: 5, token: fakeUid },
            { value: 10 }, // HTR, will use default mock for spyUtxos
          ],
        },
        receive: {
          tokens: [
            { value: 5, token: fakeUid },
            { value: 10 },
          ],
        },
      })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('atomic-swap[complete with custom tokens] response', { body: response.body });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      isComplete: true,
      data: expect.any(String),
    });

    const dataParts = response.body.data.split('|');
    expect(dataParts).toHaveLength(4);

    const tx = hathorLib.helpersUtils.createTxFromHex(dataParts[1], new hathorLib.Network('testnet'));
    expect(tx.inputs).toHaveLength(2); // 1 from send.tokens and another from inputs
    expect(tx.outputs).toHaveLength(3); // 2 intended and 1 change
  });
});
