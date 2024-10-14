/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  constants: hathorLibConstants,
  SendTransaction,
  transactionUtils,
} = require('@hathor/wallet-lib');
const { parametersValidation } = require('../../../helpers/validations.helper');
const { mapTxReturn, markUtxosSelectedAsInput, runSendTransaction } = require('../../../helpers/tx.helper');
const { DEFAULT_PIN } = require('../../../constants');
const { lockSendTx } = require('../../../helpers/lock.helper');

async function buildTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /** @type {{ logger: import('winston').Logger }} */
  const { logger } = req;
  const network = req.wallet.getNetworkObject();
  const { outputs } = req.body;
  const inputs = req.body.inputs || [];
  const changeAddress = req.body.change_address || null;
  // `mark_inputs_as_used` but if it's undefined or null defaults to `false`.
  const markAsUsed = req.body.mark_inputs_as_used ?? false;

  if (changeAddress && !await req.wallet.isAddressMine(changeAddress)) {
    res.send({ success: false, error: 'Change address does not belong to the loaded wallet.' });
    return;
  }

  for (const output of outputs) {
    if (!output.token) {
      output.token = hathorLibConstants.NATIVE_TOKEN_UID;
    }
  }
  try {
    const sendTransaction = new SendTransaction({
      storage: req.wallet.storage,
      outputs,
      inputs,
      changeAddress,
    });
    const txData = await sendTransaction.prepareTxData();

    if (markAsUsed) {
      await markUtxosSelectedAsInput(
        req.wallet,
        txData.inputs.map(input => ({
          txId: input.txId,
          index: input.index,
        })),
        true,
      );
    }
    txData.version = hathorLibConstants.DEFAULT_TX_VERSION;
    const tx = transactionUtils.createTransactionFromData(txData, network);

    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    logger.error(err);
    res.send({ success: false, error: err.message });
  }
}

async function buildCreateTokenTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const {
    name,
    symbol,
    amount,
  } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const createMint = req.body.create_mint ?? true;
  const mintAuthorityAddress = req.body.mint_authority_address || null;
  const allowExternalMintAuthorityAddress = req.body.allow_external_mint_authority_address || null;
  const createMelt = req.body.create_melt ?? true;
  const meltAuthorityAddress = req.body.melt_authority_address || null;
  const allowExternalMeltAuthorityAddress = req.body.allow_external_melt_authority_address || null;
  // `mark_inputs_as_used` but if it's undefined or null defaults to `false`.
  const markAsUsed = req.body.mark_inputs_as_used ?? false;

  try {
    /** @type {import('@hathor/wallet-lib').CreateTokenTransaction} */
    const createTokenTransaction = await req.wallet.prepareCreateNewToken(name, symbol, amount, {
      address,
      changeAddress,
      createMint,
      mintAuthorityAddress,
      allowExternalMintAuthorityAddress,
      createMelt,
      meltAuthorityAddress,
      allowExternalMeltAuthorityAddress,
      signTx: false,
    });

    if (markAsUsed) {
      await markUtxosSelectedAsInput(
        req.wallet,
        createTokenTransaction.inputs.map(input => ({ txId: input.hash, index: input.index })),
        true,
      );
    }

    res.send({ success: true, txHex: createTokenTransaction.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function buildMintTokensTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const {
    token,
    amount,
  } = req.body;
  const address = req.body.address || null;
  const changeAddress = req.body.change_address || null;
  const createAnotherMint = req.body.create_mint ?? true;
  const mintAuthorityAddress = req.body.mint_authority_address || null;
  const allowExternalMintAuthorityAddress = req.body.allow_external_mint_authority_address || null;
  // `mark_inputs_as_used` but if it's undefined or null defaults to `false`.
  const markAsUsed = req.body.mark_inputs_as_used ?? false;

  try {
    if (changeAddress && !await req.wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }

    /** @type {import('@hathor/wallet-lib').Transaction} */
    const mintTokenTransaction = await req.wallet.prepareMintTokensData(
      token,
      amount,
      {
        address,
        changeAddress,
        createAnotherMint,
        mintAuthorityAddress,
        allowExternalMintAuthorityAddress,
        signTx: false,
      }
    );

    if (markAsUsed) {
      await markUtxosSelectedAsInput(
        req.wallet,
        mintTokenTransaction.inputs.map(input => ({ txId: input.hash, index: input.index })),
        true,
      );
    }
    res.send({ success: true, txHex: mintTokenTransaction.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function buildMeltTokensTxProposal(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  /** @type {{ logger: import('winston').Logger }} */
  const { logger } = req;
  const {
    token,
    amount,
  } = req.body;

  const depositAddress = req.body.deposit_address || null;
  const changeAddress = req.body.change_address || null;
  const createAnotherMelt = req.body.create_melt ?? true;
  const meltAuthorityAddress = req.body.melt_authority_address || null;
  const allowExternalMeltAuthorityAddress = req.body.allow_external_melt_authority_address || null;
  // `mark_inputs_as_used` but if it's undefined or null defaults to `false`.
  const markAsUsed = req.body.mark_inputs_as_used ?? false;

  try {
    if (changeAddress && !await req.wallet.isAddressMine(changeAddress)) {
      throw new Error('Change address is not from this wallet');
    }

    /** @type {import('@hathor/wallet-lib').Transaction} */
    const meltTokenTransaction = await req.wallet.prepareMeltTokensData(
      token,
      amount,
      {
        address: depositAddress,
        changeAddress,
        createAnotherMelt,
        meltAuthorityAddress,
        allowExternalMeltAuthorityAddress,
        signTx: false,
      }
    );

    if (markAsUsed) {
      await markUtxosSelectedAsInput(
        req.wallet,
        meltTokenTransaction.inputs.map(input => ({ txId: input.hash, index: input.index })),
        true,
      );
    }

    res.send({ success: true, txHex: meltTokenTransaction.toHex() });
  } catch (err) {
    logger.error(err);
    res.send({ success: false, error: err.message });
  }
}

async function getMySignatures(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex } = req.body;
  try {
    const sigs = await req.wallet.getAllSignatures(txHex, DEFAULT_PIN);
    res.send({ success: true, signatures: sigs });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

/**
 * Method to create a Transaction instance from the tx in hex format and
 * an array of P2SH signatures.
 *
 * @param {HathorWallet} wallet The wallet object
 * @param {string} txHex The transaction in hex format
 * @param {Array[string]} signatures the serialized P2SHSignatures of this transaction
 * @returns {Promise<Transaction>}
 */
async function assemblePartialTransaction(wallet, txHex, signatures) {
  const multisigData = await wallet.getMultisigData();
  if (signatures.length !== multisigData.numSignatures) {
    throw new Error(
      `Quantity of signatures different than expected. \
Expected ${multisigData.numSignatures} Received ${signatures.length}`
    );
  }
  const tx = await wallet.assemblePartialTransaction(txHex, signatures);
  tx.prepareToSend();
  return tx;
}

async function signTx(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const { txHex } = req.body;
  const signatures = req.body.signatures || [];
  try {
    const tx = await assemblePartialTransaction(req.wallet, txHex, signatures);
    res.send({ success: true, txHex: tx.toHex() });
  } catch (err) {
    res.send({ success: false, error: err.message });
  }
}

async function signAndPush(req, res) {
  const validationResult = parametersValidation(req);
  if (!validationResult.success) {
    res.status(400).json(validationResult);
    return;
  }

  const [unlock, errorMsg] = lockSendTx(req.walletId);
  if (errorMsg !== null) {
    res.send({ success: false, error: errorMsg });
    return;
  }

  const { txHex } = req.body;
  const signatures = req.body.signatures || [];
  try {
    const tx = await assemblePartialTransaction(req.wallet, txHex, signatures);

    const sendTransaction = new SendTransaction({
      storage: req.wallet.storage,
      transaction: tx,
    });
    const response = await runSendTransaction(sendTransaction, unlock);
    res.send({ success: true, ...mapTxReturn(response) });
  } catch (err) {
    // The unlock method should be always called. `runSendTransaction` method
    // already calls unlock, so we can manually call it only in the catch block.
    unlock();
    res.send({ success: false, error: err.message });
  }
}

module.exports = {
  buildTxProposal,
  buildCreateTokenTxProposal,
  buildMintTokensTxProposal,
  buildMeltTokensTxProposal,
  getMySignatures,
  signTx,
  signAndPush,
};
