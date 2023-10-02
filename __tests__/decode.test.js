import { PartialTx, ProposalInput, ProposalOutput } from '@hathor/wallet-lib/lib/models/partial_tx';
import { Network, Address, P2PKH, Transaction, Input, Output, HathorWallet } from '@hathor/wallet-lib';
import httpFixtures from './__fixtures__/http-fixtures';
import TestUtils from './test-utils';
import settings from '../src/settings';

const walletId = 'stub_decode';

describe('decode api', () => {
  beforeAll(async () => {
    const config = settings.getConfig();
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    await TestUtils.startWallet({
      walletId,
      preCalculatedAddresses: TestUtils.multisigAddresses,
      multisig: true
    });
  });

  afterAll(async () => {
    const config = settings.getConfig();
    config.multisig = {};
    settings._setConfig(config);
    await TestUtils.stopWallet({ walletId });
  });

  it('should fail if txHex is not a hex string', async () => {
    let response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: '0123g' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should fail if txHex is an invalid transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: '0123456789abcdef' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
  });

  it('should return the inputs and outputs of the original txHex', async () => {
    const tx = {
      outputs: [
        { address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc', value: 6000 },
        { address: 'wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau', value: 400 },
      ],
    };
    let response = await TestUtils.request
      .post('/wallet/p2sh/tx-proposal')
      .send(tx)
      .set({ 'x-wallet-id': walletId });

    const { txHex } = response.body;

    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tx).toBeDefined();
    // inputs
    expect(response.body.tx.inputs).toBeDefined();
    expect(response.body.tx.inputs[0].index).toBeDefined();
    expect(response.body.tx.inputs[0].txId).toBeDefined();
    // outputs
    expect(response.body.tx.outputs).toBeDefined();
    expect(response.body.tx.outputs.length).toBe(tx.outputs.length);
    expect(response.body.tx.outputs[0].decoded.address).toBe(tx.outputs[0].address);
    expect(response.body.tx.outputs[0].value).toBe(tx.outputs[0].value);
    expect(response.body.tx.outputs[1].decoded.address).toBe(tx.outputs[1].address);
    expect(response.body.tx.outputs[1].value).toBe(tx.outputs[1].value);
  });

  it('should return even if the transaction is not complete', async () => {
    const partialTx = 'PartialTx|0001000000000000000000000062bb48b50000000000||';
    const txHex = '0001000000000000000000000062bb48b50000000000';
    const expected = {
      success: true,
      tx: {
        type: 'Transaction',
        version: 1,
        completeSignatures: false,
        tokens: [],
        inputs: [],
        outputs: [],
      },
      balance: {},
    };

    let response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expected);

    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ partial_tx: partialTx })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expected);
  });

  it('should fail if there is not only one of txHex or partialTx', async () => {
    const partialTx = 'PartialTx|0001000000000000000000000062bb48b50000000000||';
    const txHex = '0001000000000000000000000062bb48b50000000000';

    let response = await TestUtils.request
      .post('/wallet/decode')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex, partial_tx: partialTx })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return the inputs and outputs of a partialTx', async () => {
    const fakeToken1 = '00007f27e1970643427b0ea235d4c9b4cc700d0f6925e2cf1044b30a3259a995';
    const fakeToken2 = '0000540e59bc09ce5aa25f1f7c21702e58e6e5dd8149d1eceb033bb606682590';
    const fakeInputHash = '0000adf1516e44876ffba27de0345fe847aa85146515a5c4ea34732ddb3708f4';
    const spy = jest.spyOn(PartialTx.prototype, 'validate')
      .mockImplementation(async () => true);

    const partialTx = new PartialTx(new Network('testnet'));

    let address = new Address(TestUtils.addresses[0]);
    let script = new P2PKH(address);
    partialTx.outputs.push(
      new ProposalOutput(
        10,
        script.createScript(),
        { token: fakeToken1, tokenData: 1 }
      )
    );

    address = new Address(TestUtils.addresses[1]);
    script = new P2PKH(address);
    partialTx.outputs.push(new ProposalOutput(20, script.createScript()));

    partialTx.inputs.push(
      new ProposalInput(
        fakeInputHash,
        1,
        30,
        TestUtils.addresses[2],
        { token: fakeToken2, tokenData: 1 },
      )
    );

    const txHistoryResponse = httpFixtures['/thin_wallet/address_history'];
    const txHistory = txHistoryResponse.history;
    const fakeTx = txHistory[0];
    const fakeTxResponse = {
      success: true,
      tx: fakeTx,
      meta: {
        first_block_height: 1234,
      },
    };
    TestUtils.httpMock.onGet('/transaction').reply(200, fakeTxResponse);

    // 1 input, 2 outputs
    const response = await TestUtils.request
      .post('/wallet/decode')
      .send({ partial_tx: partialTx.serialize() })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('decode[partial tx] response', { body: response.body, partial_tx: partialTx.serialize() });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      tx: expect.objectContaining({
        completeSignatures: false,
        tokens: expect.arrayContaining([fakeToken1, fakeToken2]),
        inputs: [
          {
            txId: fakeInputHash,
            index: 1,
            value: 6400,
            decoded: {
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              type: 'MultiSig',
              timelock: null,
            },
            script: expect.any(String),
            token: '00',
            tokenData: 0,
            token_data: 0,
            mine: true,
            signed: false,
          },
        ],
        outputs: [
          expect.objectContaining({
            value: 10,
            tokenData: 1,
            token_data: 1,
            token: fakeToken1,
            decoded: {
              address: TestUtils.addresses[0],
              timelock: null,
            },
            script: expect.any(String),
            type: 'p2pkh',
            mine: false,
          }),
          expect.objectContaining({
            value: 20,
            tokenData: 0,
            token_data: 0,
            decoded: {
              address: TestUtils.addresses[1],
              timelock: null,
            },
            script: expect.any(String),
            token: '00',
            type: 'p2pkh',
            mine: false,
          }),
        ],
      }),
      balance: {
        '00': {
          tokens: { available: -6400, locked: 0 },
          authorities: {
            melt: { available: 0, locked: 0 },
            mint: { available: 0, locked: 0 },
          },
        },
      },
    });

    spy.mockRestore();
  });

  it('should fetch the correct token from the tx the inputs are spending', async () => {
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

    const txHex = tx.toHex();

    const txObj = {
      tokens: ['token1'],
      outputs: [
        {
          decoded: {
            type: 'P2PKH',
            address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
          },
          value: 1,
          token_data: 0,
          script: 'input0-script',
        },
        {
          decoded: {
            type: 'P2PKH',
            address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
          },
          value: 1,
          token_data: 1,
          script: 'input1-script',
        },
        {
          decoded: {
            type: 'P2PKH',
            address: 'WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc',
          },
          value: 1,
          token_data: 2,
          script: 'input1-script',
        },
      ],
    };
    const getTxMock = jest.spyOn(HathorWallet.prototype, 'getFullTxById').mockImplementation(async () => ({
      success: true,
      tx: txObj,
    }));

    const response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.tx).toBeDefined();
    // inputs
    expect(response.body.tx.inputs).toBeDefined();
    expect(response.body.tx.inputs[0].index).toEqual(0);
    expect(response.body.tx.inputs[0].txId).toEqual(txId0);
    expect(response.body.tx.inputs[0].token).toEqual('00');
    expect(response.body.tx.inputs[1].index).toEqual(1);
    expect(response.body.tx.inputs[1].txId).toEqual(txId1);
    expect(response.body.tx.inputs[1].token).toEqual('token1');
    expect(response.body.tx.inputs[2].index).toEqual(2);
    expect(response.body.tx.inputs[2].txId).toEqual(txId2);
    expect(response.body.tx.inputs[2].token).not.toBeDefined();
    // outputs
    expect(response.body.tx.outputs).toBeDefined();
    expect(response.body.tx.outputs.length).toBe(tx.outputs.length);
    expect(response.body.tx.outputs[0].decoded.address).toBe(tx.outputs[0].address);
    expect(response.body.tx.outputs[0].value).toBe(100);

    getTxMock.mockRestore();
  });
});
