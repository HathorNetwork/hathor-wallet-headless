import { WALLET_CONSTANTS } from './integration/utils/test-utils-integration';
import {
  multisigWalletsData, WalletPrecalculationHelper,
} from '../src/helpers/wallet-precalculation.helper';
import precalculatedMultisig from './integration/configuration/precalculated-multisig-wallets.json';

describe('wallet addresses precalculation', () => {
  it('correctly generates addresses for a known common wallet', () => {
    const { words } = WALLET_CONSTANTS.genesis;
    const generatedWallet = WalletPrecalculationHelper.generateWallet({ words });

    for (const i in generatedWallet.addresses) {
      expect(generatedWallet.addresses[i]).toBe(WALLET_CONSTANTS.genesis.addresses[i]);
    }
  });

  it('correctly generates addresses for a known multisig wallet', () => {
    const generatedWallet = WalletPrecalculationHelper.generateWallet({
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
});
