/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');
const crypto = require('crypto');
const hathorLib = require('@hathor/wallet-lib');

const axios = require('axios');
const uuid4 = require('uuid4');
const jwt = require('jsonwebtoken');

const { getConfig } = require('../settings');

const FIREBLOCKS_VERSION = 'v1';

const TX_ALREADY_EXISTS_ERROR_CODE = 1438;

/**
 * Encode Fireblocks signature using DER encoding.
 * For more information about this method, read about DER encoding ecdsa signatures.
 *
 * @param {object} sig
 * @returns {Buffer}
 */
function fireblocksSignatureToDER(sig) {
  const r = Buffer.from(sig.r, 'hex');
  const s = Buffer.from(sig.s, 'hex');

  const rneg = !!(r[0] & 0x80);
  const sneg = !!(s[0] & 0x80);

  const rbuf = rneg ? Buffer.concat([Buffer.from([0x00]), r]) : r;
  const sbuf = sneg ? Buffer.concat([Buffer.from([0x00]), s]) : s;

  const rlen = rbuf.length;
  const slen = sbuf.length;
  const length = 2 + rlen + 2 + slen;

  // 0x30 is a sequence header followed by the length in bytes of the sequence (with headers)
  // 0x02 is an integer header followed by the length in bytes of the integer then the integer
  return Buffer.concat([
    Buffer.from([0x30, length, 0x02, rlen]),
    rbuf,
    Buffer.from([0x02, slen]),
    sbuf,
  ]);
}

/**
 * Get signatures of the transaction for the wallet in the storage
 * @param {hathorLib.Transaction} tx
 * @param {hathorLib.Storage} storage
 * @param {FireblocksClient} client
 */
async function getTxSignatures(tx, storage, client) {
  const dataToSignHash = tx.getDataToSignHash();
  const inputSignatures = [];
  let ncCallerSignature = null;
  let ncCallerIndex = null;
  const signingIndices = [];

  for await (const { tx: spentTx, input, index: inputIndex } of storage.getSpentTxs(tx.inputs)) {
    if (input.data) {
      // This input is already signed
      continue;
    }

    const spentOut = spentTx.outputs[input.index];

    if (!spentOut.decoded.address) {
      // This output is not owned
      continue;
    }
    const addressInfo = await storage.getAddressInfo(spentOut.decoded.address);
    if (!addressInfo) {
      // Not a wallet address
      continue;
    }

    const pubkeyHex = await storage.getAddressPubkey(addressInfo.bip32AddressIndex);
    const pubkey = Buffer.from(pubkeyHex, 'hex');

    signingIndices.push({
      inputIndex,
      addressIndex: addressInfo.bip32AddressIndex,
      pubkey,
    });
  }

  /* istanbul ignore next */
  if (tx.version === hathorLib.constants.NANO_CONTRACTS_VERSION) {
    const { pubkey } = tx;
    const address = hathorLib.addressUtils.getAddressFromPubkey(pubkey.toString('hex'), storage.config.getNetwork());
    const addressInfo = await storage.getAddressInfo(address.base58);
    if (addressInfo) {
      ncCallerIndex = addressInfo.bip32AddressIndex;
    }
  }

  // Now we sign
  const indices = signingIndices.map(data => data.addressIndex);
  if (ncCallerIndex) {
    indices.push(ncCallerIndex);
  }

  // create signature data object from the response
  const fbTxInfo = await client.sendRawTransaction(dataToSignHash, indices);
  if (!fbTxInfo.signedMessages) {
    throw new Error(`Fireblocks did not return signatures for the transaction(${fbTxInfo.id}); external-id: (${dataToSignHash.toString('hex')})`);
  }
  const signedMessagesObj = {};
  for (const item of fbTxInfo.signedMessages) {
    if (item.content !== dataToSignHash.toString('hex')) {
      throw new Error(`Fireblocks returned inconsistent signatures in transaction(${fbTxInfo.id}); external-id: (${dataToSignHash.toString('hex')})`);
    }
    if (item.derivationPath[4] in signedMessagesObj) {
      // duplicate signature due to inputs from the same address
      // Since the content is the same we can safely skip it
      continue;
    }
    signedMessagesObj[item.derivationPath[4]] = {
      signature: fireblocksSignatureToDER(item.signature),
      content: item.content,
      publicKey: item.publicKey,
    };
  }

  for (const data of signingIndices) {
    const sig = signedMessagesObj[data.addressIndex];
    if (!sig) {
      throw new Error(`Fireblocks did not return signature for address index ${data.addressIndex} in transaction(${fbTxInfo.id}); external-id: (${dataToSignHash.toString('hex')})`);
    }
    if (sig.publicKey !== data.pubkey.toString('hex')) {
      throw new Error(`Fireblocks signature does not match locally generated public key in transaction(${fbTxInfo.id}); external-id: (${dataToSignHash.toString('hex')})`);
    }
    inputSignatures.push({
      ...data,
      signature: sig.signature,
    });
  }

  if (ncCallerIndex) {
    const sig = signedMessagesObj[ncCallerIndex];
    if (!sig) {
      throw new Error(`Fireblocks did not return signature for address index ${ncCallerIndex} in transaction(${fbTxInfo.id}); external-id: (${dataToSignHash.toString('hex')})`);
    }
    ncCallerSignature = fireblocksSignatureToDER(sig.signature);
  }

  return {
    inputSignatures,
    ncCallerSignature,
  };
}

class FireblocksClient {
  constructor(baseUrl, apiKey, apiSecret) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.secret = apiSecret;

    this.client = axios.create({
      baseURL: baseUrl,
    });
  }

  /**
   * Create the JWT authz token for a request.
   *
   * @param {string} path URI of the request (path + querystring)
   * @param {Object|undefined} body Body of the request
   * @returns {string}
   */
  signJWT(path, body) {
    const nonce = uuid4();
    const now = Math.floor(Date.now() / 1000);

    const bodyJson = body ? JSON.stringify(body) : '';
    const bodyHash = crypto.createHash('sha256').update(Buffer.from(bodyJson)).digest().toString('hex');

    const headers = {
      uri: path,
      nonce,
      iat: now,
      exp: now + 60, // Adjusted to ensure it's within the required timeframe
      sub: this.apiKey,
      bodyHash,
    };
    return jwt.sign(headers, this.secret, { algorithm: 'RS256' });
  }

  /**
   * GET a request to Fireblocks.
   *
   * @param {string} path URI of the request (path + querystring)
   * @returns {Promise<Object>} Fireblocks axios response
   */
  async getRequest(path) {
    const token = this.signJWT(path);
    return this.client.get(path, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
  }

  /**
   * Post a request to Fireblocks.
   *
   * @param {string} path URI of the request (path + querystring)
   * @param {Object|undefined} body Body of the request
   * @returns {Promise<Object>} Fireblocks axios response
   */
  async postRequest(path, body) {
    const token = this.signJWT(path, body);
    return this.client.post(path, body, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
  }

  /**
   * Post a raw transaction.
   * @param {Buffer} dataToSignHash sha256d of sighash_all of a Transaction
   * @param {number[]} indices - bip32 Address indices
   * @returns {Promise<Object>} Fireblocks response
   */
  async postRawTransaction(dataToSignHash, indices) {
    const rawTx = createRawTransaction(dataToSignHash, indices);
    const response = await this.postRequest(`/${FIREBLOCKS_VERSION}/transactions`, rawTx);
    return response.data;
  }

  /**
   * Send a raw transaction.
   * Will create the RAW transaction, wait for it to be ready and return the tx info.
   * @param {Buffer} dataToSignHash sha256d of sighash_all of a Transaction
   * @param {number[]} indices - bip32 Address indices
   */
  async sendRawTransaction(dataToSignHash, indices) {
    try {
      await this.postRawTransaction(dataToSignHash, indices);
    } catch (e) {
      if (!(
        e.response
        && e.response.data
        && e.response.data.code === TX_ALREADY_EXISTS_ERROR_CODE
      )) {
        console.error(e);
        throw e;
      }
      // This transaction was already submitted.
      // We can safely ignore the error and fetch the tx info.
      console.log('Raw transaction already submitted, fetching tx info...');
    }
    const txId = dataToSignHash.toString('hex');
    let txStatus = null;
    let txInfo = null;
    let count = 0;

    while (txStatus !== 'COMPLETED' && txStatus !== 'FAILED') {
      count += 1;
      if (count > 600) {
        throw new Error('Transaction signing timeout');
      }
      // eslint-disable-next-line no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, 1000));
      txInfo = await this.getTxStatusByExternalId(txId);
      txStatus = txInfo.status;
    }

    return txInfo;
  }

  /**
   * Get transaction status
   * @param {string} txId - Fireblocks transaction id
   * @returns {Promise<Object>}
   */
  async getTxStatus(txId) {
    const response = await this.getRequest(`/${FIREBLOCKS_VERSION}/transactions/${txId}`);
    return response.data;
  }

  /**
   * Get transaction status by external id.
   * @param {string} txId - External transaction id.
   * @returns {Promise<Object>}
   */
  async getTxStatusByExternalId(txId) {
    const response = await this.getRequest(`/${FIREBLOCKS_VERSION}/transactions/external_tx_id/${txId}`);
    return response.data;
  }

  /**
   * Get address pubkey info.
   * @param {number} index
   * @returns {Promise<Object>}
   */
  async getAddressPubkeyInfo(index) {
    const derivationPath = [44, 280, 0, 0, index];
    let uri = `/${FIREBLOCKS_VERSION}/vault/public_key_info`;
    uri += `?derivationPath=${JSON.stringify(derivationPath)}`;
    uri += '&algorithm=MPC_ECDSA_SECP256K1&compressed=true';

    const response = await this.getRequest(uri);
    return response.data;
  }
}

/**
 * Create a RAW transaction object to be sent to Fireblocks.
 * @param {Buffer} dataToSignHash sha256d of sighash_all of a Transaction
 * @param {number[]} indices - bip32 Address indices
 * @returns {Object}
 */
function createRawTransaction(dataToSignHash, indices) {
  return {
    operation: 'RAW',
    externalTxId: dataToSignHash.toString('hex'),
    note: 'Hathor tx sent from headless wallet using raw signing',
    // fee: '0',
    extraParameters: {
      rawMessageData: {
        algorithm: 'MPC_ECDSA_SECP256K1',
        messages: indices.map(index => ({
          content: dataToSignHash.toString('hex'),
          derivationPath: [44, 280, 0, 0, index],
        })),
      }
    }
  };
}

/**
 * Start Fireblocks client with the headless config.
 * @returns {FireblocksClient}
 */
function startClient() {
  const config = getConfig();

  let apiSecret = config.fireblocksApiSecret;
  if (config.fireblocksApiSecretFile && fs.existsSync(config.fireblocksApiSecretFile)) {
    apiSecret = fs.readFileSync(config.fireblocksApiSecretFile, { encoding: 'utf8' }).trim();
  }

  return new FireblocksClient(
    config.fireblocksUrl,
    config.fireblocksApiKey,
    apiSecret,
  );
}

/**
 * External tx signer method to register with our wallet-lib.
 * @param {hathorLib.Transaction} tx
 * @param {hathorLib.Storage} storage
 * @param {string} _ - pinCode is not used with Fireblocks
 */
async function fireblocksSigner(tx, storage, _) {
  const client = startClient();
  const signatures = getTxSignatures(tx, storage, client);
  return signatures;
}

module.exports = {
  fireblocksSigner,
  FireblocksClient,
  startClient,
};
