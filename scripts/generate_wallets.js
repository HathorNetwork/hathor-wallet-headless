/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  multisigWalletsData, WalletPrecalculationHelper,
} from '../src/helpers/wallet-precalculation.helper';

const GENERATION_SCRIPT_MODES = {
  singleExistingWallet: 0,
  singleMultisigWallet: 1,
  manyCommonWallets: 2,
  manyMultisigWallets: 3,
  newWallet: 4,
};

//-------------------------------------------------------
// Configuration for the script
//-------------------------------------------------------

/**
 * Defines how this script will behave
 * @type {number}
 */
const executionMode = GENERATION_SCRIPT_MODES.singleMultisigWallet;

// Configurations for the mode defined above
const words = multisigWalletsData.words[4];
// const words = WALLET_CONSTANTS.genesis.words;
const multisigInput = {
  wordsArray: multisigWalletsData.words,
  minSignatures: 2
};
const outputFileForMultipleWallets = './tmp/multiple-output.json';

//-------------------------------------------------------
// Script execution
//-------------------------------------------------------

let generatedWallet;
let walletsArray;
switch (executionMode) {
  case GENERATION_SCRIPT_MODES.singleExistingWallet:
    generatedWallet = WalletPrecalculationHelper.generateWallet({ words });
    break;

  case GENERATION_SCRIPT_MODES.singleMultisigWallet:
    generatedWallet = WalletPrecalculationHelper.generateWallet({
      words,
      multisig: multisigInput
    });
    break;

  case GENERATION_SCRIPT_MODES.manyCommonWallets:
    walletsArray = WalletPrecalculationHelper.generateMultipleWallets();
    break;

  case GENERATION_SCRIPT_MODES.manyMultisigWallets:
    walletsArray = WalletPrecalculationHelper.generateMultisigWalletsForWords({
      minSignatures: multisigInput.minSignatures,
      wordsArray: multisigInput.wordsArray
    });
    break;

  case GENERATION_SCRIPT_MODES.newWallet:
  default:
    generatedWallet = WalletPrecalculationHelper.generateWallet();
    break;
}

if (walletsArray) {
  const helper = new WalletPrecalculationHelper(outputFileForMultipleWallets);
  helper._serializeWalletsFile(walletsArray)
    .then(() => {
      process.exit(0);
    });
} else {
  console.log(generatedWallet);
}
