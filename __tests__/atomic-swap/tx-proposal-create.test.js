import hathorLib, { config, swapService } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';
import atomicSwapServiceMethods from '../../src/services/atomic-swap.service';

const walletId = 'stub_atomic_swap_create_tx_proposal';

describe('create tx-proposal api', () => {
  const fakeTxId = '00003392e185c6e72d7d8073ef94649023777fd23c828514f505a7955abf0caf';
  const fakeUid = '0000219a831aaa7b011973981a286142b3002cd04763002e23ba6fec7dadda44';
  const spyApi = jest.spyOn(hathorLib.txApi, 'getTransaction');
  const spyUtxos = jest.spyOn(hathorLib.Storage.prototype, 'selectUtxos');
  async function* mockUtxos(options) {
    yield {
      txId: fakeTxId,
      index: 0,
      token: hathorLib.constants.NATIVE_TOKEN_UID,
      address: TestUtils.addresses[0],
      value: 10n,
      authorities: 0n,
      timelock: null,
      type: 1,
      height: null,
    };
  }

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
              token: hathorLib.constants.NATIVE_TOKEN_UID,
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
    spyUtxos.mockImplementation(mockUtxos);
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

  it('should return no success with an invalid partial_tx', async () => {
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        partial_tx: 'invalid-partial-tx',
        receive: {
          tokens: [{ value: 5, address: TestUtils.addresses[3] }],
        },
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid PartialTx',
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
          tokens: [{ token: '00', value: 10 }], // value match input on getAvailableUtxos, so no change
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
          tokens: [{ value: 1 }], // value less than input from getAvailableUtxos
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
    async function* mockUtxosToken(hwallet, token) {
      yield {
        txId: fakeTxId,
        index: 1,
        token: fakeUid,
        address: TestUtils.addresses[0],
        value: 10n,
        authorities: 0,
        timelock: null,
        type: 1,
        height: null,
      };
    }
    spyUtxos.mockImplementationOnce(mockUtxosToken);
    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal')
      .send({
        send: {
          tokens: [
            { value: 5, token: fakeUid },
            { value: 10 }, // HTR, will use default
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

  describe('using the service as a mediator', () => {
    config.setSwapServiceBaseUrl('http://fake-swap-service');

    it('should not interact with the service if the feature flag is disabled', async () => {
      // De-activating the global feature flag.
      global.constants.SWAP_SERVICE_FEATURE_TOGGLE = false;
      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            is_new: true,
            password: 'ab' // Invalid password, should be rejected
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
      });
    });

    it('should return no success with an invalid password', async () => {
      // Activating the global feature flag. All tests from now on will have it available.
      global.constants.SWAP_SERVICE_FEATURE_TOGGLE = true;
      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            is_new: true,
            password: 'ab'
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Password must have at least 3 characters'
      });
    });

    it('should return no success when service also had no success', async () => {
      const mockLib = jest.spyOn(swapService, 'create')
        .mockImplementationOnce(async () => ({ success: false }));

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            is_new: true,
            password: 'abc'
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Unable to create the proposal on the Atomic Swap Service'
      });

      mockLib.mockRestore();
    });

    it('should return no success when service throws', async () => {
      const mockLib = jest.spyOn(swapService, 'create')
        .mockImplementationOnce(async () => { throw new Error('Service failure'); });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            is_new: true,
            password: 'abc'
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Service failure'
      });

      mockLib.mockRestore();
    });

    it('should return the proposal identifier that was generated on success', async () => {
      const mockLib = jest.spyOn(swapService, 'create')
        .mockImplementationOnce(async () => ({ success: true, id: 'mock-id' }));

      let response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            is_new: true,
            password: 'abc'
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(String),
        isComplete: false,
        createdProposalId: 'mock-id',
      });

      // The listProposals route should confirm this proposal is being listened to now
      response = await TestUtils.request
        .get('/wallet/atomic-swap/tx-proposal/list')
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        success: true,
        proposals: ['mock-id'],
      });

      mockLib.mockRestore();
    });
  });

  describe('updating a proposal on the service mediator', () => {
    global.constants.SWAP_SERVICE_FEATURE_TOGGLE = true;

    it('should require the mandatory parameters', async () => {
      // Missing version
      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            proposal_id: 'mock-id',
            // version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing mandatory parameters: version'
      });
    });

    it('should require the proposal to be registered', async () => {
      // Ensure the proposal does not exist in the listened proposals map
      await atomicSwapServiceMethods.removeListenedProposal(
        walletId,
        'mock-id',
      );

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            proposal_id: 'mock-id',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Proposal is not registered. Register it first.'
      });
    });

    it('should return no success when service throws', async () => {
      // Configuring the local storage for the following tests
      await atomicSwapServiceMethods.addListenedProposal(
        walletId,
        '1a574e6c-7329-4adc-b98c-b70fb20ef919',
        'abc123',
      );

      const mockLib = jest.spyOn(swapService, 'update')
        .mockImplementationOnce(async () => { throw new Error('Test Service failure'); });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            proposal_id: '1a574e6c-7329-4adc-b98c-b70fb20ef919',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Test Service failure'
      });

      mockLib.mockRestore();
    });

    it('should return no success when service also had no success', async () => {
      const mockLib = jest.spyOn(swapService, 'update')
        .mockResolvedValue({ success: false });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            proposal_id: '1a574e6c-7329-4adc-b98c-b70fb20ef919',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Unable to update the proposal on the Atomic Swap Service'
      });

      mockLib.mockRestore();
    });

    it('should return success when the service mediator also had success', async () => {
      const mockLib = jest.spyOn(swapService, 'update')
        .mockResolvedValue({ success: true });

      const response = await TestUtils.request
        .post('/wallet/atomic-swap/tx-proposal')
        .send({
          receive: {
            tokens: [{ token: '00', value: 10 }],
          },
          service: {
            proposal_id: '1a574e6c-7329-4adc-b98c-b70fb20ef919',
            version: 0,
          }
        })
        .set({ 'x-wallet-id': walletId });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(String),
        isComplete: false,
      });

      mockLib.mockRestore();
    });
  });
});
