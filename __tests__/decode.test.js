import TestUtils from "./test-utils";

describe("decode api", () => {
  beforeAll(async () => {
    global.config.multisig = TestUtils.multisigData;
    // Stop P2PKH wallet started on setupTests
    await TestUtils.stopWallet();
    // Start a MultiSig wallet
    return TestUtils.startWallet({multisig: true});
  });

  afterAll(() => {
    global.config.multisig = {};
    return;
  });

  it("should fail if txHex is not a hex string", async () => {
    let response = await TestUtils.request
      .post("/wallet/decode")
      .send({txHex: 123})
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();

    response = await TestUtils.request
      .post("/wallet/decode")
      .send({txHex: '0123g'})
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBeFalsy();
  });

  it("should fail if txHex is an invalid transaction", async () => {
    const response = await TestUtils.request
      .post("/wallet/decode")
      .send({txHex: '0123456789abcdef'})
      .set({ "x-wallet-id": TestUtils.walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBeFalsy();
  });

  it("should return the inputs and outputs of the original txHex", async () => {
    const tx = {
      outputs: [
        { address: "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc", value: 6000 },
        { address: "wcUZ6J7t2B1s8bqRYiyuZAftcdCGRSiiau", value: 400 },
      ],
    };
    let response = await TestUtils.request
      .post("/wallet/tx-proposal")
      .send(tx)
      .set({ "x-wallet-id": TestUtils.walletId });

    const txHex = response.body.txHex;

    response = await TestUtils.request
      .post("/wallet/decode")
      .send({txHex})
      .set({ "x-wallet-id": TestUtils.walletId });
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
});
