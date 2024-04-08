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

const FIREBLOCKS_VERSION = 'v1';

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
    throw new Error('Fireblocks did not return signatures');
  }
  const signedMessagesObj = {};
  for (const item of fbTxInfo.signedMessages) {
    if (item.content !== dataToSignHash.toString('hex')) {
      throw new Error(`Fireblocks returned inconsistent signatures in transaction ${fbTxInfo.id}`);
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
      throw new Error(`Fireblocks did not return signature for address index ${data.addressIndex}`);
    }
    if (sig.publicKey !== data.pubkey.toString('hex')) {
      throw new Error(`Fireblocks signature does not match locally generated public key in transaction ${fbTxInfo.id}`);
    }
    inputSignatures.push({
      ...data,
      signature: sig.signature,
    });
  }

  if (ncCallerIndex) {
    const sig = signedMessagesObj[ncCallerIndex];
    if (!sig) {
      throw new Error(`Fireblocks did not return signature for address index ${ncCallerIndex}`);
    }
    ncCallerSignature = sig.signature.fullSig;
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
      baseURL: this.baseUrl,
    });
  }

  signJWT(path, body) {
    const nonce = uuid4();
    const now = Math.floor(Date.now() / 1000);

    const bodyJson = body ? JSON.stringify(body) : '';
    const bodyHash = crypto.createHash('sha256').update(Buffer.from(bodyJson)).digest().toString('hex');

    const headers = {
      uri: path,
      nonce,
      iat: now,
      exp: now + 55, // Adjusted to ensure it's within the required timeframe
      sub: this.apiKey,
      bodyHash,
    };
    return jwt.sign(headers, this.secret, { algorithm: 'RS256' });
  }

  async postRawTransaction(dataToSignHash, indices) {
    const rawTx = createRawTransaction(dataToSignHash, indices);
    const token = this.signJWT(`/${FIREBLOCKS_VERSION}/transactions`, rawTx);

    const response = await this.client.post(`/${FIREBLOCKS_VERSION}/transactions`, rawTx, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
    return response.data;
  }

  async sendRawTransaction(dataToSignHash, indices) {
    const rawTx = await this.postRawTransaction(dataToSignHash, indices);
    const txId = rawTx.id;
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
      txInfo = await this.getTxStatus(txId);
      txStatus = txInfo.status;
    }

    return txInfo;
  }

  async getTxStatus(txId) {
    const token = this.signJWT(`/${FIREBLOCKS_VERSION}/transactions/${txId}`);
    const response = await this.client.get(`/${FIREBLOCKS_VERSION}/transactions/${txId}`, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
    return response.data;
  }

  async getAddressPubkeyInfo(index) {
    const derivationPath = [44, 280, 0, 0, index];
    let uri = `/${FIREBLOCKS_VERSION}/vault/public_key_info`;
    uri += `?derivationPath=${JSON.stringify(derivationPath)}`;
    uri += '&algorithm=MPC_ECDSA_SECP256K1&compressed=true';

    const token = this.signJWT(uri);

    const response = await this.client.get(uri, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
    return response.data;
  }

  async test() {
    const uri = '/v1/vault/accounts_paged?orderBy=DESC&limit=1';
    const token = this.signJWT(uri);

    const response = await this.client.get(uri, {
      headers: {
        'X-API-Key': this.apiKey,
        Authorization: `Bearer ${token}`,
      }
    });
    return response.data;
  }
}

function createRawTransaction(dataToSignHash, indices) {
  return {
    operation: 'RAW',
    externalTxId: `${dataToSignHash.toString('hex')}-${uuid4()}`,
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
  FireblocksClient,
};
