import { Input, Output, Transaction, Network, Address, P2PKH, P2SH, helpersUtils } from '@hathor/wallet-lib';
import TestUtils from '../test-utils';
import settings from '../../src/settings';

const walletId = 'stub_atomic_swap_p2sh';

describe('atomic-swap with p2sh', () => {
  const testnet = new Network('testnet');
  const scriptFromAddress = (base58, isMultisig) => {
    let script;
    if (isMultisig) {
      script = new P2SH(new Address(base58, { network: testnet }));
    } else {
      script = new P2PKH(new Address(base58, { network: testnet }));
    }

    return script.createScript();
  };

  beforeAll(async () => {
    const config = settings.getConfig();
    config.multisig = TestUtils.multisigData;
    settings._setConfig(config);
    return TestUtils.startWallet({
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

  it('should fail if params are invalid', async () => {
    let response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-input-data')
      .send({ txHex: 123 })
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-input-data')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should allow p2sh wallets to participate on an atomic-swap', async () => {
    const spy = jest.spyOn(helpersUtils, 'createTxFromHex')
      .mockImplementation((txh, nt) => new Transaction(
        [
          new Input('hash1', 0, { data: Buffer.from('dead01', 'hex') }),
          new Input('hash2', 1, { data: Buffer.from('beef02', 'hex') }),
        ],
        [
          new Output(
            10,
            scriptFromAddress(TestUtils.addresses[0], false),
            { tokenData: 0 }
          ),
        ],
      ));

    const spyDataToSign = jest.spyOn(Transaction.prototype, 'getDataToSign')
      .mockImplementation(() => Buffer.from('cafe', 'hex'));

    const response = await TestUtils.request
      .post('/wallet/atomic-swap/tx-proposal/get-input-data')
      .send({ txHex: 'abc123' })
      .set({ 'x-wallet-id': walletId });
    TestUtils.logger.debug('[atomic-swap:get-input-data] should allow', { body: response.body });
    expect(spy).toBeCalledWith('abc123', expect.anything());
    expect(spyDataToSign).toHaveBeenCalled();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      signatures: expect.any(String),
    });

    spy.mockRestore();
    spyDataToSign.mockRestore();
  });
});
