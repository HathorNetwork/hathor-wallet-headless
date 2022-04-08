/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * The endpoints that return a created tx must keep compatibility
 * The library has changed some keys and we must map the return to continue returning the same keys
 * Inputs: 'tx_id' now is 'hash'
 * Outputs: 'token_data' now is 'tokenData'
 */
function mapTxReturn(tx) {
  for (const input of tx.inputs) {
    input.tx_id = input.hash;
  }

  for (const output of tx.outputs) {
    output.token_data = output.tokenData;
  }

  return tx;
}

/**
 * Method that select utxos to be used in a transaction
 * following the filter query sent in the request
 *
 * XXX this method should be created in the lib itself
 * however the current version of the lib is already incompatible with
 * the method calls we have right now after some refactors were done
 * to use the facada in the wallets mobile/desktop.
 * Because of that I decided to create this method here for now,
 * not only because it would require more changes to fix the incompatibilities but
 * we will change even more in the following weeks when we finish the integration
 * of the lib with the wallet service and the signature methods alignment.
 * Then part of the work here would be lost anyway in the following weeks.
 *
 * I leave this comment here because, as soon as we finish the wallet service integration in the lib
 * and align the methods signatures, we will fix the incompatibilities in the headless and then we
 * can add this method in the lib
 *
 * @param {HathorWallet} wallet The wallet object
 * @param {number} sumOutputs The sum of outputs of the transaction I need to fill
 * @param {Object} options The options to filter the utxos
 *                         (see utxo-filter API to see the possibilities)
 */
function getUtxosToFillTx(wallet, sumOutputs, options) {
  // We want to find only utxos to use in the tx, so we must filter by available only
  const getUtxosOptions = {
    ...options,
    only_available_utxos: true
  };
  const utxosDetails = wallet.getUtxos(getUtxosOptions);
  // If I can't fill all the amount with the returned utxos, then return null
  if (utxosDetails.total_amount_available < sumOutputs) {
    return null;
  }

  const { utxos } = utxosDetails;
  // Sort utxos with larger amounts first
  utxos.sort((a, b) => b.amount - a.amount);

  if (utxos[0].amount > sumOutputs) {
    // If I have a single utxo capable of providing the full amount
    // then I find the smallest utxos that can fill the full amount

    // This is the index of the first utxo that does not fill the full amount
    // if this is -1, then all utxos fill the full amount and I should get the last one
    const firstSmallerIndex = utxos.findIndex(obj => obj.amount < sumOutputs);

    if (firstSmallerIndex === -1) {
      // Return the last element of the array (the one with smaller amount)
      return [utxos.pop()];
    }
    // Return the element right before the first element that does not provide the full amount
    return [utxos[firstSmallerIndex - 1]];
  }
  // Else I get the utxos in order until the full amount is filled
  let total = 0;
  const retUtxos = [];
  for (const utxo of utxos) {
    retUtxos.push(utxo);
    total += utxo.amount;

    if (total >= sumOutputs) {
      return retUtxos;
    }
  }
  return null;
}

module.exports = {
  mapTxReturn,
  getUtxosToFillTx,
};
