const { cloneDeep } = require('lodash');

const defaultConfig = {
  http_bind_address: 'localhost',
  http_port: 8000,

  // Hathor Full-node
  network: 'testnet',
  server: 'http://localhost:8083/v1a/',

  // Tx Mining Service
  txMiningUrl: 'http://localhost:8035',

  // Wallet seeds
  seeds: {
    default: '',
  },

  multisig: {},

  httpLogFormat: null,
  consoleLevel: 'silly',
  tokenUid: '',
  gapLimit: null,

  /*
   * When we leave this as null, we use the connectionTimeout default, which is 5000, i.e. 5s.
   *
   * This timeout is the maximum time that the websocket waits for a PONG message after sending
   * a PING message before assuming the full node has gone down. With the currently low performance
   * of tests, the full node is being fully loaded and we are increasing this timeout in order to
   * prevent any wrong websocket reload.
   */
  connectionTimeout: 30000,
  allowPassphrase: false,
  confirmFirstAddress: false,
};

let config = cloneDeep(defaultConfig);

export default {
  setupConfig: jest.fn().mockImplementation(() => Promise.resolve()),
  reloadConfig: jest.fn().mockImplementation(() => Promise.resolve()),
  getConfig: () => config,
  // utilities to change the configuration at runtime
  _getDefaultConfig: () => cloneDeep(defaultConfig),
  _setConfig: c => {
    config = c;
  },
  _resetConfig: () => {
    config = cloneDeep(defaultConfig);
  },
};
