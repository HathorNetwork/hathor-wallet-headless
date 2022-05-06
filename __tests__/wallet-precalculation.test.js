import fs from 'fs';
import { WALLET_CONSTANTS } from './integration/configuration/test-constants';
import {
  multisigWalletsData, WalletPrecalculationHelper,
} from '../src/helpers/wallet-precalculation.helper';
import precalculatedMultisig from './integration/configuration/precalculated-multisig-wallets.json';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

const fakeWallet = {
  isUsed: false,
  words: 'waste edit random program emotion vapor people scheme axis phone peasant end real tired panther build subject pyramid ceiling glory nature proud monitor empower',
  addresses: ['WYLW8ujPemSuLJwbeNvvH6y7nakaJ6cEwT',
    'WUfmqHWQZWn7aodAFadwmSDfh2QaUUgCRJ',
    'Wi8zvxdXHjaUVAoCJf52t3WovTZYcU9aX6',
    'WSu4PZVu6cvi3aejtG8w7bomVmg77DtqYt',
    'WVbN5f2vS4TyP2XmS2x8aG2Qc5oACy3e7L',
    'WY6wbpDWE1EFHpKzaknp9hMSrhZiH5jJ9s',
    'WXQs68APxW9VTpbjK9FBMWrwWidxTwZpoN',
    'WeWod5pie133e6DW3PRjhsXDp4Yq6d2D9a',
    'Waf7MEhFy6ibcrA4sCKuKidEcW9p7E7C48',
    'WXzfjqxKqe44yLfrsx3bmbXFRehhEgUofC',
    'WfWFSZYyAaGTEDuLyMPAdotLuiMhkDUkyS',
    'Wg7BaqXikZBDQcWipgauMSR38qAvsUVZvy',
    'WhFKDjgBRScAqZHfc1XvWHj3nwVAgUvuUf',
    'Wjos8haw4WnqkK2KauC19Xb53XLFzx5bB5',
    'Wf5ivZqY6Ky7rp1MTPvWn2TgXgykYMos6x',
    'WQ3YUhdLtL3D1RZvj1wGz2BSGW1bM9Wj12',
    'WXfhSWZYaEQbkWAjFJF7bBjYtv8jHavYC6',
    'WYd8CMafF44mnVZUBZrdPqcNFFVhCm737s',
    'Wg7wUVBBuAKenAa6FWBi9pJAE83rHmvSzQ',
    'WPm5JsTnYyuWQfpwRStDRshJb7X4XXPih3',
    'Wgop7ug1pTDJhhUVMzAUTEznzRRLEdzAGr',
    'WcRom2aEeLkcQMmiv1myTLZRG1Q6G6htEJ'
  ],
};

describe('wallet addresses precalculation', () => {
  it('correctly generates addresses for a known common wallet', () => {
    const { words } = WALLET_CONSTANTS.genesis;
    const generatedWallet = WalletPrecalculationHelper.generateAddressesForSeed({ words });

    for (const i in generatedWallet.addresses) {
      expect(generatedWallet.addresses[i]).toBe(WALLET_CONSTANTS.genesis.addresses[i]);
    }
  });

  it('correctly generates addresses for a new wallet', () => {
    const generatedWallet = WalletPrecalculationHelper.generateAddressesForSeed();

    expect(generatedWallet).toHaveProperty('words');
    expect(generatedWallet.words.split(' ')).toHaveProperty('length', 24);
    expect(generatedWallet.addresses).toHaveProperty('length', 22);
  });

  it('correctly generates multiple new wallets with a specified amount', () => {
    jest.spyOn(WalletPrecalculationHelper, 'generateAddressesForSeed')
      .mockImplementation(() => ({ words: 'mockedWords', addresses: ['mock1', 'mock2'] }));
    const walletsArray = WalletPrecalculationHelper.generateMultipleWallets({
      commonWallets: 5
    });
    jest.restoreAllMocks();

    expect(walletsArray).toHaveProperty('length', 5);
  });

  it('correctly generates multiple new wallets with a default amount', () => {
    const mockedFn = jest.spyOn(WalletPrecalculationHelper, 'generateAddressesForSeed')
      .mockImplementation(() => ({ words: 'mockedWords', addresses: ['mock1', 'mock2'] }));
    WalletPrecalculationHelper.generateMultipleWallets();
    expect(mockedFn).toHaveBeenCalledTimes(100);
    jest.restoreAllMocks();
  });

  it('correctly generates addresses for a known multisig wallet', () => {
    const generatedWallet = WalletPrecalculationHelper.generateAddressesForSeed({
      words: multisigWalletsData.words[0],
      multisig: {
        wordsArray: multisigWalletsData.words,
        minSignatures: 3
      }
    });

    for (const i in generatedWallet.addresses) {
      expect(generatedWallet.addresses[i]).toBe(precalculatedMultisig[0].addresses[i]);
    }
  });

  it('correctly generates addresses for all multisig wallets of a same group', () => {
    const mock = jest.spyOn(WalletPrecalculationHelper, 'generateAddressesForSeed')
      .mockImplementation(() => ({ words: 'mockedWords', addresses: ['mock1', 'mock2'] }));

    const generatedWallets = WalletPrecalculationHelper.generateMultisigWalletsForWords({
      wordsArray: multisigWalletsData.words,
      minSignatures: 3
    });

    expect(mock).toHaveBeenCalledTimes(multisigWalletsData.words.length);
    expect(mock).toHaveBeenCalledWith({
      words: multisigWalletsData.words[0],
      multisig: {
        wordsArray: multisigWalletsData.words,
        minSignatures: 3
      }
    });

    expect(generatedWallets).toHaveProperty('length', multisigWalletsData.words.length);
  });
});

describe('pre-generated wallet storage management', () => {
  it('can flag a used wallet', () => {
    const helper = new WalletPrecalculationHelper();
    helper.walletsDb.push({ ...fakeWallet });
    expect(helper.walletsDb[0]).toHaveProperty('isUsed', false);

    const pregenWallet = helper.getPrecalculatedWallet();
    expect(pregenWallet).toEqual(helper.walletsDb[0]);
    expect(helper.walletsDb[0]).toHaveProperty('isUsed', true);
  });

  it('does not fetch used wallets', () => {
    const helper = new WalletPrecalculationHelper();
    helper.walletsDb.push({ ...fakeWallet, isUsed: true });
    helper.walletsDb.push({ ...fakeWallet, words: 'my fake words' });

    const pregenWallet = helper.getPrecalculatedWallet();
    expect(pregenWallet.words).toEqual('my fake words');
  });
});

describe('precalculation persistent storage', () => {
  it('can read a json file with wallets', async () => {
    fs.promises.readFile.mockImplementation(
      async () => `[${JSON.stringify(fakeWallet)}]`
    );

    const helper = new WalletPrecalculationHelper('fakeFilename.json');
    await helper.initWithWalletsFile();

    expect(helper.walletsDb).toHaveProperty('length', 1);
    expect(helper.walletsDb[0]).toEqual(fakeWallet);

    jest.resetAllMocks();
  });

  it('the default json file with wallets is set', async () => {
    const mockReadFile = fs.promises.readFile.mockImplementation(
      async () => `[${JSON.stringify(fakeWallet)}]`
    );

    const helper = new WalletPrecalculationHelper();
    await helper.initWithWalletsFile();

    expect(mockReadFile).toBeCalledWith('./tmp/wallets.txt');

    jest.resetAllMocks();
  });

  it('can handle error on loading a corrupt json file', async () => {
    fs.promises.readFile.mockImplementation(
      async () => `[${JSON.stringify(fakeWallet)},]`
    );

    const helper = new WalletPrecalculationHelper('fakeFilename.json');
    const results = await helper.initWithWalletsFile().catch(err => err);
    expect(results).toBeInstanceOf(SyntaxError);
    expect(results.message).toContain('JSON');

    jest.resetAllMocks();
  });

  it('can write a json file with wallets', async () => {
    const mockWriteFile = fs.promises.writeFile.mockImplementation(async () => 'ok');

    const helper = new WalletPrecalculationHelper('fakeFilename.json');
    helper.walletsDb = [{ ...fakeWallet }];
    helper.walletsDb[0].words = 'my fake words that are invalid as a seed';

    await helper.storeDbIntoWalletsFile();
    const comparison = `[\n${JSON.stringify(helper.walletsDb[0])}\n]`;
    expect(mockWriteFile).toHaveBeenCalledWith('fakeFilename.json', comparison);

    jest.resetAllMocks();
  });
});
