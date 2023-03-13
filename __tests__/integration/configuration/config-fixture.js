const config = {
  http_bind_address: 'localhost',
  http_port: 8000,

  // Hathor Full-node
  network: 'privatenet',
  server: 'http://localhost:8083/v1a/',

  // Tx Mining Service
  txMiningUrl: 'http://localhost:8035',

  // Atomic Swap Service
  atomicSwapService: 'http://localhost:3001/dev',

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

// Allow change config at runtime
global.config = config;

export default config;
