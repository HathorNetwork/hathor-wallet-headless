/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const crypto = require('crypto');
const hathorLib = require('@hathor/wallet-lib');

const axios = require('axios');
const uuid4 = require('uuid4');
const jwt = require('jsonwebtoken');

const { getConfig } = require('../settings');

const HARDENED_BIT = 0x80000000;

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

  createRawTransaction(dataToSignHash, indices);
  // TODO: create signature data object from the response
  await client.sendRawTransaction(dataToSignHash, indices);
  throw new Error('Not implemented yet');
}

class FireblocksClient {
  constructor(baseUrl, apiKey, apiSecret) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.secret = apiSecret;

    this.client = axios.create({
      baseURL: this.baseUrl,
    });
  }

  signJWT(path, body) {
    const nonce = uuid4();
    const now = Math.floor(Date.now() / 1000);

    const bodyHash = crypto.createHash('sha256').update(Buffer.from(body || '')).digest('hex');

    const headers = {
      uri: path,
      nonce,
      iat: now,
      exp: now + 30, // Adjusted to ensure it's within the required timeframe
      sub: this.apiKey,
      bodyHash,
    };
    return jwt.sign(headers, this.secret, { algorithm: 'RS256' });
  }

  async sendRawTransaction(dataToSignHash, indices) {
    const rawTx = createRawTransaction(dataToSignHash, indices);
    const token = this.signJWT('/transactions', rawTx);

    const response = this.client.post('/transactions', rawTx, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
    console.log(JSON.stringify(response.data));

    const txId = response.data.id;
    let txStatus = null;
    let txInfo = null;
    let count = 0;

    while (!(txStatus === 'COMPLETED' && txStatus === 'FAILED')) {
      count += 1;
      if (count > 600) {
        throw new Error('Transaction signing timeout');
      }
      // eslint-disable-next-line no-promise-executor-return
      await new Promise(resolve => setTimeout(resolve, 1000));
      txInfo = await this.getTxStatus(txId);
      txStatus = txInfo.status;
    }

    console.log(JSON.stringify(txInfo, null, 2));
  }

  async getTxStatus(txId) {
    const token = this.signJWT(`/transactions/${txId}`);
    const response = await this.client.get(`/transactions/${txId}`, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
    console.log(JSON.stringify(response.data));
    return response.data;
  }
}

function createRawTransaction(dataToSignHash, indices) {
  return {
    operation: 'RAW',
    externalTxId: dataToSignHash,
    note: 'Hathor tx sent from headless wallet using raw signing',
    // fee: '0',
    extraParameters: {
      rawMessageData: {
        messages: indices.map(index => ({
          content: dataToSignHash,
          derivationPath: [44 + HARDENED_BIT, 280 + HARDENED_BIT, HARDENED_BIT, 0, index],
        })),
      }
    }
  };
}

function startClient() {
  const config = getConfig();

  return new FireblocksClient(
    config.fireblocksUrl,
    config.fireblocksApiKey,
    config.fireblocksApiSecret,
  );
}

async function fireblocksSigner(tx, storage, _) {
  const client = startClient();
  const signatures = getTxSignatures(tx, storage, client);
  return signatures;
}

module.exports = {
  fireblocksSigner,
};
