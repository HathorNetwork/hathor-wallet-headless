import {
  HathorWallet,
  helpersUtils,
  Network,
} from '@hathor/wallet-lib';
import { HATHOR_TOKEN_CONFIG } from '@hathor/wallet-lib/lib/constants';
import TestUtils from '../test-utils';

const walletId = 'stub_tx_proposal_create_tx';
const FAKE_TX_ID = '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca';
const TOKEN_UID = '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed';
const TX_ID = '0000010f2704effbd7f45d31fac77b318efe6f92db1d5b120c379fbbea5b614b';

describe('create tx-proposal api', () => {
  let spyUtxos;
  let spyCreateTx;

  beforeAll(async () => {
    await TestUtils.startWallet({ walletId, preCalculatedAddresses: TestUtils.addresses });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  beforeEach(() => {
    spyUtxos = jest.spyOn(HathorWallet.prototype, 'getUtxos');
    spyCreateTx = jest.spyOn(helpersUtils, 'createTxFromData');
  });

  afterEach(() => {
    spyUtxos.mockRestore();
    spyCreateTx.mockRestore();
  });

  it('should not accept transactions without address or value', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0] }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ value: 1 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept transactions with 0 value', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 0 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept tx inputs without index or hash', async () => {
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1 }],
        inputs: [{ hash: FAKE_TX_ID }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1 }],
        inputs: [{ index: 0 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept wrong custom tokens', async () => {
    // non hex value
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1, token: 'FAKE_CUSTOM_TOKEN' }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    // Hex value but invalid token uid (!== 64 chars)
    response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1, token: '09af' }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should not accept incomplete data outputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ type: 'data' }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
  });

  it('should fail if query return insufficient funds', async () => {
    spyUtxos.mockReturnValueOnce({
      total_amount_available: 10,
      utxos: [
        { amount: 10, tx_id: FAKE_TX_ID, index: 0 },
      ],
    });
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [
          { address: TestUtils.addresses[0], value: 11 },
        ],
        inputs: [{
          type: 'query',
        }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      token: HATHOR_TOKEN_CONFIG.uid,
      error: 'No utxos available for the query filter for this amount.',
    });

    // check spyUtxos with query options
    expect(spyUtxos).toHaveBeenCalledWith({
      type: 'query',
      token: HATHOR_TOKEN_CONFIG.uid,
      only_available_utxos: true,
    });
  });

  it('should fail if there are any errors on the wallet-lib methods', async () => {
    spyCreateTx.mockImplementationOnce(() => {
      throw new Error('Boom!');
    });

    // Should fail with the transaction.prepareData error
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: false,
      error: 'Boom!',
    });
  });

  it('should accept outputs with HTR', async () => {
    // Implicit HTR: no token field
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1 }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
      dataToSignHash: expect.any(String),
    });

    // Explicit HTR: token 00
    response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1, token: HATHOR_TOKEN_CONFIG.uid }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
      dataToSignHash: expect.any(String),
    });
  });

  it('should accept outputs with custom tokens', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1, token: TOKEN_UID }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
      dataToSignHash: expect.any(String),
    });
  });

  it('should accept data outputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ type: 'data', data: '0099aaffAAFF' }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
      dataToSignHash: expect.any(String),
    });
  });

  it('should accept a transaction with mixed data output and address outputs', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [
          { type: 'data', data: 'cafed00d' },
          { address: TestUtils.addresses[0], value: 10 },
          { address: TestUtils.addresses[1], value: 15, token: TOKEN_UID },
          { address: TestUtils.multisigAddresses[0], value: 20 },
          { address: TestUtils.multisigAddresses[1], value: 25, token: TOKEN_UID },
        ],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
      dataToSignHash: expect.any(String),
    });

    const tx = helpersUtils.createTxFromHex(response.body.txHex, new Network('testnet'));
    expect(tx.getDataToSignHash().toString('hex')).toEqual(response.body.dataToSignHash);

    expect(tx.outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 1, tokenData: 0, decodedScript: { data: 'cafed00d' } }),
      expect.objectContaining({
        value: 10,
        tokenData: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: TestUtils.addresses[0] })
        }),
      }),
      expect.objectContaining({
        value: 15,
        tokenData: 1,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: TestUtils.addresses[1] })
        }),
      }),
      expect.objectContaining({
        value: 20,
        tokenData: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: TestUtils.multisigAddresses[0] })
        }),
      }),
      expect.objectContaining({
        value: 25,
        tokenData: 1,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: TestUtils.multisigAddresses[1] })
        }),
      }),
    ]));
  });

  it('should use the query input filters', async () => {
    // HTR inputs utxos
    // The helper getUtxosToFillTx will filter utxos to send the least amount of inputs.
    spyUtxos.mockReturnValueOnce({
      total_amount_available: 6400,
      utxos: [
        { amount: 6400, tx_id: TX_ID, index: 0 },
      ],
    });
    // custom token utxos
    // The helper will add both since we need them to fill the output
    spyUtxos.mockReturnValueOnce({
      total_amount_available: 100,
      utxos: [
        { amount: 100, tx_id: TOKEN_UID, index: 1 },
      ],
    });
    let response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [
          { address: TestUtils.addresses[0], value: 10 },
          { address: TestUtils.addresses[1], value: 20, token: TOKEN_UID }
        ],
        inputs: [{
          type: 'query',
          max_utxos: 27,
          filter_address: TestUtils.addresses[2],
          amount_smaller_than: '20',
          amount_bigger_than: '10',
          maximum_amount: 100,
        }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
    });

    // check spyUtxos with query options
    expect(spyUtxos).toHaveBeenCalledWith({
      type: 'query',
      max_utxos: 27,
      filter_address: TestUtils.addresses[2],
      amount_smaller_than: 20,
      amount_bigger_than: 10,
      maximum_amount: 100,
      token: HATHOR_TOKEN_CONFIG.uid,
      only_available_utxos: true,
    });
    expect(spyUtxos).toHaveBeenCalledWith({
      type: 'query',
      max_utxos: 27,
      filter_address: TestUtils.addresses[2],
      amount_smaller_than: 20,
      amount_bigger_than: 10,
      maximum_amount: 100,
      token: TOKEN_UID,
      only_available_utxos: true,
    });

    // Will run a similar query but passing only 1 parameter
    spyUtxos.mockReturnValueOnce({
      total_amount_available: 6400,
      utxos: [
        { amount: 6400, tx_id: TX_ID, index: 0 },
      ],
    });
    response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [
          { address: TestUtils.addresses[3], value: 40 },
        ],
        inputs: [{
          type: 'query',
          filter_address: TestUtils.addresses[4],
        }],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
    });

    expect(spyUtxos).toHaveBeenCalledWith({
      type: 'query',
      filter_address: TestUtils.addresses[4],
      token: HATHOR_TOKEN_CONFIG.uid,
      only_available_utxos: true,
    });
  });

  it('should use the provided change_address', async () => {
    const response = await TestUtils.request
      .post('/wallet/tx-proposal')
      .send({
        outputs: [{ address: TestUtils.addresses[0], value: 1 }],
        change_address: TestUtils.addresses[1],
      })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      txHex: expect.any(String),
      dataToSignHash: expect.any(String),
    });

    // Check that we have the intended output and a change for the address
    const tx = helpersUtils.createTxFromHex(response.body.txHex, new Network('testnet'));
    expect(tx.outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        value: 1,
        tokenData: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: TestUtils.addresses[0] })
        }),
      }),
      expect.objectContaining({
        tokenData: 0,
        decodedScript: expect.objectContaining({
          address: expect.objectContaining({ base58: TestUtils.addresses[1] })
        }),
      }),
    ]));
  });
});
