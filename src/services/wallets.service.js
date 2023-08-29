/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { HathorWallet } = require("@hathor/wallet-lib");

/**
 * @type {Map<string, HathorWallet>}
 */
const initializedWallets = new Map();
/**
 * @typedef TxProposalConfig
 * @property {string} id Proposal identifier on the Atomic Swap Service
 * @property {string} password Password to access it
 */

/**
 * A map of all the proposals for a wallet.
 * The keys are the proposal ids
 * @typedef {Map<string,TxProposalConfig>} WalletListenedProposals
 */

/**
 * A map of the initialized wallets and their listened proposals.
 * The keys are the wallet-ids
 * @type {Map<string,WalletListenedProposals>}
 */
const walletListenedProposals = new Map();

module.exports = {
  initializedWallets,
  walletListenedProposals,
};
