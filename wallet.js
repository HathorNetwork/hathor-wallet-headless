/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';

import EventEmitter from 'events';

/**
 * This is a Wallet that is supposed to be simple to be used by a third-party app.
 *
 * This class handles all the details of syncing, including receiving the same transaction
 * multiple times from the server. It also keeps the balance of the tokens updated.
 *
 * It has the following states:
 * - CLOSED: When it is disconnected from the server.
 * - CONNECTING: When it is connecting to the server.
 * - SYNCING: When it has connected and is syncing the transaction history.
 * - READY: When it is ready to be used.
 *
 * You can subscribe for the following events:
 * - state: Fired when the state of the Wallet changes.
 * - new-tx: Fired when a new tx arrives.
 * - update-tx: Fired when a known tx is updated. Usually, it happens when one of its outputs is spent.
 * - more-addresses-loaded: Fired when loading the history of transactions. It is fired multiple times,
 *                          one for each request sent to the server.
 **/
class Wallet extends EventEmitter {
  constructor({ network, server, seed }) {
    super();

    hathorLib.network.setNetwork(network);
    this.network = network;

    this.state = Wallet.CLOSED;
    this.serverInfo = null;

    this.onConnectionChange = this.onConnectionChange.bind(this);
    this.handleWebsocketMsg = this.handleWebsocketMsg.bind(this);
    this.onAddressesLoaded = this.onAddressesLoaded.bind(this);

    this.server = server;
    this.seed = seed;

    this.passphrase = '';
    this.pinCode = '123';
    this.password = '123';
  }

  /**
   * Called when loading the history of transactions.
   * It is called every HTTP Request to get the history of a set of addresses.
   * Usually, this is called multiple times.
   * The `historyTransactions` contains all transactions, including the ones from a previous call to this method.
   *
   * @param {Object} result {historyTransactions, allTokens, newSharedAddress, newSharedIndex, addressesFound}
   **/
  onAddressesLoaded(result) {
    this.emit('more-addresses-loaded', result);
  }

  /**
   * Called when the connection to the websocket changes.
   * It is also called if the network is down.
   **/
  onConnectionChange(value) {
    if (value) {
      this.setState(Wallet.SYNCING);
      hathorLib.wallet.loadAddressHistory(0, hathorLib.constants.GAP_LIMIT).then(() => {
        this.setState(Wallet.READY);
      }).catch((error) => {
        throw error;
      })
    } else {
      // CONNECTING or CLOSED?
      this.serverInfo = null;
      this.setState(Wallet.CONNECTING);
    }
  }

  getAddressToUse() {
    return hathorLib.wallet.getAddressToUse();
  }

  getCurrentAddress() {
    return hathorLib.wallet.getCurrentAddress();
  }

  /**
   * Called when a new message arrives from websocket.
   **/
  handleWebsocketMsg(wsData) {
    if (wsData.type === 'wallet:address_history') {
      this.onNewTx(wsData);
    }
  }

  reloadData() {
    // TODO Reload data?
    console.log('reloadData');
  }

  getHTRBalance() {
    const historyTransactions = this.getTxHistory();
    return hathorLib.wallet.calculateBalance(Object.values(historyTransactions), Wallet.HTR_TOKEN.uid);
  }

  getTxHistory() {
    const data = hathorLib.wallet.getWalletData();
    const historyTransactions = 'historyTransactions' in data ? data['historyTransactions'] : {};
    return historyTransactions;
  }

  setState(state) {
    this.state = state;
    this.emit('state', state);
  }

  onNewTx(wsData) {
    const newTx = wsData.history;

    // TODO we also have to update some wallet lib data? Lib should do it by itself
    const walletData = hathorLib.wallet.getWalletData();
    const historyTransactions = 'historyTransactions' in walletData ? walletData.historyTransactions : {};
    const allTokens = 'allTokens' in walletData ? walletData.allTokens : [];

    let isNewTx = true;
    if (newTx.tx_id in historyTransactions) {
      isNewTx = false;
    }

    hathorLib.wallet.updateHistoryData(historyTransactions, allTokens, [newTx], null, walletData);

    if (isNewTx) {
      this.emit('new-tx', newTx);
    } else {
      this.emit('update-tx', newTx);
    }
    return;

    // TODO XXX Uncomment the following block to keep track of the balance.
    /*
    // We need to reload it because it was modified by updateHistoryData.
    const newWalletData = hathorLib.wallet.getWalletData();
    const { keys } = newWalletData;

    const updatedHistoryMap = {};
    const updatedBalanceMap = {};
    const balances = this.getTxBalance(newTx);

    // we now loop through all tokens present in the new tx to get the new history and balance
    for (const [tokenUid, tokenTxBalance] of Object.entries(balances)) {
      // we may not have this token yet, so state.tokensHistory[tokenUid] would return undefined
      const currentHistory = state.tokensHistory[tokenUid] || [];
      const newTokenHistory = addTxToSortedList(tokenUid, tx, tokenTxBalance, currentHistory);
      updatedHistoryMap[tokenUid] = newTokenHistory;
      // totalBalance should not be confused with tokenTxBalance. The latter is the balance of the new
      // tx, while the former is the total balance of the token, considering all tx history
      const totalBalance = getBalance(tokenUid);
      updatedBalanceMap[tokenUid] = totalBalance;
    }
    const newTokensHistory = Object.assign({}, state.tokensHistory, updatedHistoryMap);
    const newTokensBalance = Object.assign({}, state.tokensBalance, updatedBalanceMap);

    hathorLib.storage.setItem('local:tokens:history', newTokensHistory);
    hathorLib.storage.setItem('local:tokens:balance', newTokensBalance);
    */
  };

  /**
   * Send a transaction with multi tokens
   * @param {Object} data Array of {'address', 'value', 'token'}
   */
  sendMultiTokenTransaction(data) {
    const txData = {
      inputs: [],
      outputs: []
    }

    const walletData = hathorLib.wallet.getWalletData();
    const historyTxs = 'historyTransactions' in walletData ? walletData.historyTransactions : {};

    // First I need an array with all tokens
    const allTokens = [];
    for (const d of data) {
      if (allTokens.indexOf(d.token) === -1) {
        allTokens.push(d.token);
      }
    }

    for (const d of data) {
      const dataOutput = {'address': d.address, 'value': d.value, 'tokenData': hathorLib.tokens.getTokenIndex(allTokens, d.token.uid)};
      const partialData = {'inputs': [], 'outputs': [dataOutput]}
      const result = hathorLib.wallet.prepareSendTokensData(partialData, d.token, true, historyTxs, allTokens);

      if (!result.success) {
        console.log('Error sending tx:', result.message);
        return;
      }

      const dataToken = result.data;

      txData['inputs'] = [...txData['inputs'], ...dataToken['inputs']];
      txData['outputs'] = [...txData['outputs'], ...dataToken['outputs']];
    }

    txData.tokens = hathorLib.tokens.filterTokens(allTokens, hathorLib.constants.HATHOR_TOKEN_CONFIG).map((token) => token.uid);

    const updateOutputs = (val) => {
      const historyTxs = 'historyTransactions' in walletData ? walletData.historyTransactions : {};
      for (const input of txData.inputs) {
        historyTxs[input.tx_id]['outputs'][input.index]['spent_by'] = val;
      }
    }

    // TODO XXX Setting input as spent by, so it won't be chosen again
    updateOutputs('2');

    const promise = new Promise((resolve, reject) => {
      hathorLib.transaction.sendTransaction(txData, this.pinCode).then((result) => {
        if (result.success === false) {
          // XXX Setting outputs as spent_by null again
          updateOutputs(null);
        }
        resolve(result);
      }, (error) => {
        // XXX Setting outputs as spent_by null again
        updateOutputs(null);
        reject(error);
      });
    })

    return promise;
  }

  /**
   * Send tokens to only one address.
   **/
  sendTransaction(address, value, token) {
    const isHathorToken = token.uid === hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
    const tokenData = (isHathorToken? 0 : 1);
    const data = {
      tokens: isHathorToken ? [] : [token.uid],
      inputs: [],
      outputs: [{
        address, value, tokenData
      }],
    };

    const walletData = hathorLib.wallet.getWalletData();
    const historyTxs = 'historyTransactions' in walletData ? walletData.historyTransactions : {};
    const ret = hathorLib.wallet.prepareSendTokensData(data, token, true, historyTxs, [token]);

    if (!ret.success) {
      return Promise.reject(ret.message);
    }

    return hathorLib.transaction.sendTransaction(ret.data, this.pinCode);
  }

  /**
   * Connect to the server and start emitting events.
   **/
  start() {
    const store = new hathorLib.MemoryStore();
    hathorLib.storage.setStore(store);
    hathorLib.storage.setItem('wallet:server', this.server);

    hathorLib.WebSocketHandler.on('is_online', this.onConnectionChange);
    hathorLib.WebSocketHandler.on('reload_data', this.reloadData);
    hathorLib.WebSocketHandler.on('addresses_loaded', this.onAddressesLoaded);
    hathorLib.WebSocketHandler.on('wallet', this.handleWebsocketMsg);

    hathorLib.wallet.executeGenerateWallet(this.seed, this.passphrase, this.pinCode, this.password, false);

    this.serverInfo = null;
    this.setState(Wallet.CONNECTING);

    const promise = new Promise((resolve, reject) => {
      hathorLib.version.checkApiVersion().then((info) => {
        // Check network version to avoid blunders.
        if (info.network.indexOf(this.network) >= 0) {
          hathorLib.WebSocketHandler.setup();
          this.serverInfo = info;
          resolve(info);
        } else {
          this.setState(Wallet.CLOSED);
          reject(`Wrong network. server=${info.network} expected=${this.network}`);
        }
      }, (error) => {
        console.log('Version error:', error);
        this.setState(Wallet.CLOSED);
        reject(error);
      });
    });
    return promise;
  }

  /**
   * Close the connections and stop emitting events.
   **/
  stop() {
    // TODO Double check that we are properly cleaning things up.
    // See: https://github.com/HathorNetwork/hathor-wallet-headless/pull/1#discussion_r369859701
    hathorLib.WebSocketHandler.stop()
    hathorLib.WebSocketHandler.removeListener('is_online', this.onConnectionChange);
    hathorLib.WebSocketHandler.removeListener('reload_data', this.reloadData);
    hathorLib.WebSocketHandler.removeListener('addresses_loaded', this.onAddressesLoaded);
    hathorLib.WebSocketHandler.removeListener('wallet', this.handleWebsocketMsg);
    this.serverInfo = null;
    this.setState(Wallet.CLOSED);
  }

  /**
   * Returns the balance for each token in tx, if the input/output belongs to this wallet
   */
  getTxBalance(tx) {
    const myKeys = []; // TODO
    const balance = {};
    for (const txout of tx.outputs) {
      if (hathorLib.wallet.isAuthorityOutput(txout)) {
        continue;
      }
      if (txout.decoded && txout.decoded.address
          && txout.decoded.address in myKeys) {
        if (!balance[txout.token]) {
          balance[txout.token] = 0;
        }
        balance[txout.token] += txout.value;
      }
    }

    for (const txin of tx.inputs) {
      if (hathorLib.wallet.isAuthorityOutput(txin)) {
        continue;
      }
      if (txin.decoded && txin.decoded.address
          && txin.decoded.address in myKeys) {
        if (!balance[txin.token]) {
          balance[txin.token] = 0;
        }
        balance[txin.token] -= txin.value;
      }
    }

    return balance;
  }
}

// State constants.
Wallet.CLOSED =  0;
Wallet.CONNECTING = 1;
Wallet.SYNCING = 2;
Wallet.READY = 3;

// Other constants.
Wallet.HTR_TOKEN = hathorLib.constants.HATHOR_TOKEN_CONFIG;

export default Wallet;
