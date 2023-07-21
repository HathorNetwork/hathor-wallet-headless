/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { constants: { HATHOR_TOKEN_CONFIG } } = require('@hathor/wallet-lib');

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
 * to use the facade in the wallets mobile/desktop.
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
 * XXX This can be refactored to use the lib methods, specially the storage.selectUtxos
 *
 * @param {HathorWallet} wallet The wallet object
 * @param {number} sumOutputs The sum of outputs of the transaction I need to fill
 * @param {Object} options The options to filter the utxos
 *                         (see utxo-filter API to see the possibilities)
 */
async function getUtxosToFillTx(wallet, sumOutputs, options) {
  // We want to find only utxos to use in the tx, so we must filter by available only
  const getUtxosOptions = {
    ...options,
    only_available_utxos: true
  };
  const utxosDetails = await wallet.getUtxos(getUtxosOptions);
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

/**
 * @typedef PreparedTxErrorResponse
 * When a request to prepare a transaction fails the response
 * will contain information on what went wrong.
 * @property {boolean} success
 * @property {string} error Description of the error.
 * @property {string} [token] Which token this error happened at.
 */

/**
 * @typedef PreparedTxResponse
 * Prepared inputs and outputs ready to be sent as a transaction.
 * @property {boolean} success
 * @property {Object[]} outputs Prepared outputs.
 * @property {{txId: string, index: number}[]} inputs Prepared inputs.
 */

/**
 * @param {HathorWallet} wallet The wallet proposing the transaction
 * @param {Object[]} outputs Array of outputs to send
 * @param {Object[]} inputs Array of inputs to use
 * @param {string} defaultToken='00' Default token uid to use
 * @returns {Promise<PreparedTxResponse|PreparedTxErrorResponse>}
 */
async function prepareTxFunds(wallet, outputs, inputs, defaultToken = HATHOR_TOKEN_CONFIG.uid) {
  const preparedOutputs = [];
  let preparedInputs = [];

  /**
   * @typedef TokenOutput
   * A structure to help calculate how many tokens will be needed on send-tx's automatic inputs
   * @property {string} tokenUid Hash identification of the token
   * @property {number} amount Amount of tokens necessary on the inputs
   */

  /**
   * Map of tokens on the output that will be needed on the automatic input calculation
   * @type {Map<string, TokenOutput>}
   */
  const tokens = new Map();

  for (const output of outputs) {
    // If sent the new token parameter inside output, we use it
    // otherwise we try to get from old parameter in token object
    // if none exist we use default as HTR
    if (!output.token) {
      output.token = defaultToken;
    }

    // Updating the `tokens` amount
    if (!tokens.has(output.token)) {
      tokens.set(output.token, { tokenUid: output.token, amount: 0 });
    }

    if (output.type === 'data') {
      // The data output requires that the user burns 0.01 HTR
      // this must be set here, in order to make the filter_address query
      // work if the inputs are selected by this method
      output.value = 1;
    }

    const sumObject = tokens.get(output.token);
    sumObject.amount += output.value;
    preparedOutputs.push(output);
  }

  if (inputs.length > 0) {
    if (inputs[0].type === 'query') {
      const query = inputs[0];

      // query processing

      // We need to fetch UTXO's for each token on the "outputs"
      for (const element of tokens) {
        const [tokenUid, tokenObj] = element;

        const queryOptions = {
          ...query,
          token: tokenUid
        };
        const utxos = await getUtxosToFillTx(wallet, tokenObj.amount, queryOptions);
        if (!utxos) {
          return {
            success: false,
            error: 'No utxos available for the query filter for this amount.',
            token: tokenUid
          };
        }

        for (const utxo of utxos) {
          preparedInputs.push({ txId: utxo.tx_id, index: utxo.index });
        }
      }
    } else {
      // The new lib version expects input to have tx_id and not hash
      preparedInputs = inputs.map(input => ({ txId: input.hash, index: input.index }));
    }
  }

  return {
    success: true,
    inputs: preparedInputs,
    outputs: preparedOutputs,
  };
}

/**
 * Best effort to get a transaction. First look up at the storage to get a trasaction
 * from the history. If not found, query the fullnode about the transaction.
 * If the transaction is not found in the fullnode, return null.
 *
 * @param {HathorWallet} wallet
 * @param {string} id Hash of the transaction to get data from
 * @return {Promise<DecodedTx|FullNodeTx|null>} Data from the transaction to get.
 *    Can be null if both the wallet and fullnode does not contain the tx.
 *
 * @see DecodedTx at {@link https://github.com/HathorNetwork/hathor-wallet-lib/blob/bc94221cece2bd6d7b64d971ef30b7d593f07e42/src/new/wallet.js#L1058}
 * @see FullNodeTx at {@link https://github.com/HathorNetwork/hathor-wallet-lib/blob/bc94221cece2bd6d7b64d971ef30b7d593f07e42/src/wallet/types.ts#L500}
 */
async function getTx(wallet, id) {
  const tx = await wallet.getTx(id);
  if (tx) {
    return tx;
  }

  try {
    const response = await wallet.getFullTxById(id);
    if (response.success) {
      return response.tx;
    }

    console.warn('Failed to get transaction from fullnode.', response.message);
    return null;
  } catch (error) {
    console.error('Error while getting transaction from fullnode.', error);
    return null;
  }
}

module.exports = {
  mapTxReturn,
  getUtxosToFillTx,
  prepareTxFunds,
  getTx
};
