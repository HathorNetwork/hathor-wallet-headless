const config = {
  http_bind_address: 'localhost',
  http_port: 8000,

  // Hathor Full-node
  network: 'privatenet',
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
   * Usually the connectionTimeout option should be `null`, but to increase the stability of the
   * integration tests we are adding a very long timeout here.
   */
  connectionTimeout: 30000,
  allowPassphrase: false,
  confirmFirstAddress: false,
};

// Allow change config at runtime
global.config = config;

export default config;
