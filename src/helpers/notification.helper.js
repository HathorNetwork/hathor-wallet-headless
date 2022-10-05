/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  constants: {
    HATHOR_TOKEN_CONFIG,
    TOKEN_INDEX_MASK,
    TOKEN_AUTHORITY_MASK,
    TOKEN_MINT_MASK,
    TOKEN_MELT_MASK,
  },
  dateFormatter,
  HathorWallet,
  wallet: oldWallet,
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
 * @param {HathorWallet} wallet - The wallet we wish to calculate balance for.
 * @param {Object} tx
 *
 * @returns {TokenBalance}
 */
function getWalletBalanceForTx(wallet, tx) {
  const currentTimestamp = dateFormatter.dateToTimestamp(new Date());
  const isTimelocked = timelock => currentTimestamp < timelock;
  const currentHeight = oldWallet.getNetworkHeight();
  const isHeightLocked = height => (currentHeight - height) > oldWallet.getRewardLockConstant();

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
  const tokens = [HATHOR_TOKEN_CONFIG.uid].concat(tx.tokens);

  for (const input of tx.inputs) {
    const inputTx = wallet.getTx(input.tx_id);
    if (!inputTx) {
      // ignore this input since its not from the wallet
      continue;
    }
    const txout = inputTx.outputs[input.index];
    const token = tokens[txout.token_data & TOKEN_INDEX_MASK];
    if (!tokenBalance[token]) {
      tokenBalance[token] = getEmptyBalance();
    }

    if ((txout.token_data & TOKEN_AUTHORITY_MASK) > 0) {
      // This is an authority utxo being spent
      tokenBalance[token].authorities.unlocked.mint -= (txout.value & TOKEN_MINT_MASK) > 0 ? 1 : 0;
      tokenBalance[token].authorities.unlocked.melt -= (txout.value & TOKEN_MELT_MASK) > 0 ? 1 : 0;
    } else {
      // Remove input from token balance
      tokenBalance[token].tokens.unlocked -= txout.value;
    }
  }

  for (const output of tx.outputs) {
    if (output.decoded && output.decoded.address && wallet.isAddressMine(output.decoded.address)) {
      const token = tokens[txout.token_data & TOKEN_INDEX_MASK];
      if (!tokenBalance[token]) {
        tokenBalance[token] = getEmptyBalance();
      }
      
      const timelock = output.decoded.timelock && isTimelocked(output.decoded.timelock);
      const heightlock = tx.height && isHeightLocked(tx.height);
      const lockProp = (timelock || heightlock) ? "locked" : "unlocked";

      if ((output.token_data & TOKEN_AUTHORITY_MASK) > 0) {
        // Calculate authority for this output
        tokenBalance[token].authorities[lockProp].mint += (output.value & TOKEN_MINT_MASK) > 0 ? 1 : 0;
        tokenBalance[token].authorities[lockProp].melt += (output.value & TOKEN_MELT_MASK) > 0 ? 1 : 0;
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