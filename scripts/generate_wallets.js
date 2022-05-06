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
 * # Address pre-calculation script
 * This developer script generates addresses for 24-word wallet seeds.
 * To generate these addresses in various ways, use the configurations below.
 */

/**
 * ## Generating addresses for a single wallet
 * This will generate all the results only on the stdout.
 *
 * @example
 * // Generate addresses for a random new seed
 * const executionMode = GENERATION_SCRIPT_MODES.newWallet;
 *
 * @example
 * // Generate addresses for a known seed
 * const executionMode = GENERATION_SCRIPT_MODES.singleExistingWallet;
 * const words = WALLET_CONSTANTS.genesis.words;
 *
 * @example
 * // Generate addresses for a known seed (multisig)
 * const executionMode = GENERATION_SCRIPT_MODES.singleExistingWallet;
 * const words = multisigWalletsData.words[4];
 * const multisigInput = {
 *   wordsArray: multisigWalletsData.words,
 *   minSignatures: 2
 * };
 */

/**
 * ## Generating addresses for multiple wallets
 * The results will be written to the filesystem on `outputFileForMultipleWallets` path
 *
 * @example
 * // Generate addresses for a random new seed
 * const executionMode = GENERATION_SCRIPT_MODES.manyCommonWallets;
 * const outputFileForMultipleWallets = './tmp/multiple-output.json';
 *
 * @example
 * // Generate addresses for a known seed (multisig)
 * const executionMode = GENERATION_SCRIPT_MODES.manyMultisigWallets;
 * const multisigInput = {
 *   wordsArray: multisigWalletsData.words,
 *   minSignatures: 3
 * };
 */

/**
 * Defines how this script will behave
 * @type {number}
 */
const executionMode = GENERATION_SCRIPT_MODES.singleMultisigWallet;

// Configurations for the defined execution mode. A few examples are on the docstring above.
const words = multisigWalletsData.words[4];
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
    generatedWallet = WalletPrecalculationHelper.generateAddressesForSeed({ words });
    break;

  case GENERATION_SCRIPT_MODES.singleMultisigWallet:
    generatedWallet = WalletPrecalculationHelper.generateAddressesForSeed({
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
    generatedWallet = WalletPrecalculationHelper.generateAddressesForSeed();
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
