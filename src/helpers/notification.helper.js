/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  constants: {
    TOKEN_AUTHORITY_MASK,
    TOKEN_MINT_MASK,
    TOKEN_MELT_MASK,
  },
  dateFormatter,
} = require('@hathor/wallet-lib');

/**
 * @typedef {Object} Authorities
 * @property {number} mint
 * @property {number} melt
 */

/**
 * @typedef TokenBalance
 * @property {{locked: number, unlocked: number}} tokens
 * @property {{locked: Authorities, unlocked: Authorities}} authorities
 */

/**
 * Calculate the wallet balance for a tx
 *
 * XXX: This can be calculated using the lib methods
 *
 * @param {HathorWallet} wallet - The wallet we wish to calculate balance for.
 * @param {Object} tx
 *
 * @returns {Promise<TokenBalance>}
 */
async function getWalletBalanceForTx(wallet, tx) {
  const currentTimestamp = dateFormatter.dateToTimestamp(new Date());
  const isTimelocked = timelock => currentTimestamp < timelock;
  const currentHeight = await wallet.storage.getCurrentHeight();
  const rewardLock = wallet.storage.version.reward_spend_min_blocks;
  const isHeightLocked = height => (currentHeight - height) > rewardLock;

  /**
   * Create an empty token balance object.
   * @returns {TokenBalance}
   */
  const getEmptyBalance = () => ({
    tokens: { unlocked: 0, locked: 0 },
    authorities: { unlocked: { mint: 0, melt: 0 }, locked: { mint: 0, melt: 0 } },
  });

  /** @type {TokenBalance} */
  const tokenBalance = {};

  for (const input of tx.inputs) {
    if (input.decoded && input.decoded.address && wallet.isAddressMine(input.decoded.address)) {
      const { token } = input;
      if (!tokenBalance[token]) {
        tokenBalance[token] = getEmptyBalance();
      }

      if ((input.token_data & TOKEN_AUTHORITY_MASK) > 0) {
        // This is an authority utxo being spent
        tokenBalance[token].authorities.unlocked.mint -= (input.value & TOKEN_MINT_MASK) > 0
          ? 1 : 0;
        tokenBalance[token].authorities.unlocked.melt -= (input.value & TOKEN_MELT_MASK) > 0
          ? 1 : 0;
      } else {
        // Remove input from token balance
        tokenBalance[token].tokens.unlocked -= input.value;
      }
    }
  }

  for (const output of tx.outputs) {
    if (output.decoded && output.decoded.address && wallet.isAddressMine(output.decoded.address)) {
      const { token } = output;
      if (!tokenBalance[token]) {
        tokenBalance[token] = getEmptyBalance();
      }

      const timelock = output.decoded.timelock && isTimelocked(output.decoded.timelock);
      const heightlock = tx.height && isHeightLocked(tx.height);
      const lockProp = (timelock || heightlock) ? 'locked' : 'unlocked';

      if ((output.token_data & TOKEN_AUTHORITY_MASK) > 0) {
        // Calculate authority for this output
        tokenBalance[token].authorities[lockProp].mint += (output.value & TOKEN_MINT_MASK) > 0
          ? 1 : 0;
        tokenBalance[token].authorities[lockProp].melt += (output.value & TOKEN_MELT_MASK) > 0
          ? 1 : 0;
      } else {
        // calculate balance for this output
        tokenBalance[token].tokens[lockProp] += output.value;
      }
    }
  }

  return tokenBalance;
}

module.exports = {
  getWalletBalanceForTx,
};
