import { PartialTx, ProposalInput, ProposalOutput } from '@hathor/wallet-lib/lib/models/partial_tx';
import { Network, Address, P2PKH } from '@hathor/wallet-lib';
import TestUtils from './test-utils';

const walletId = 'stub_decode';

describe('decode api', () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    await TestUtils.startWallet({
      walletId,
      preCalculatedAddresses: TestUtils.multisigAddresses,
      multisig: true
    });
  });

  afterAll(async () => {
    global.config.multisig = {};
    await TestUtils.stopWallet({ walletId });
  });

  it('should fail if txHex is not a hex string', async () => {
    let response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: '0123g' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it('should fail if txHex is an invalid transaction', async () => {
    const response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex: '0123456789abcdef' })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
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
    expect(response.body.success).toBeTruthy();
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
        tokens: [],
        inputs: [],
        outputs: [],
      }
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
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post('/wallet/decode')
      .send({ txHex, partial_tx: partialTx })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
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
      new ProposalOutput(10, script.createScript(), { token: fakeToken1, tokenData: 1 })
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
        tokens: [fakeToken1, fakeToken2],
        inputs: [{ txId: fakeInputHash, index: 1 }],
        outputs: [
          expect.objectContaining({
            value: 10,
            tokenData: 1,
            token: fakeToken1,
            decoded: expect.objectContaining({ address: TestUtils.addresses[0] })
          }),
          expect.objectContaining({
            value: 20,
            tokenData: 0,
            decoded: expect.objectContaining({ address: TestUtils.addresses[1] })
          }),
        ],
      }),
    });

    spy.mockRestore();
  });
});
