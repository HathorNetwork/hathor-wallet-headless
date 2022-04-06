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
  connectionTimeout: null,
  allowPassphrase: false,
  confirmFirstAddress: false,
};

// Allow change config at runtime
global.config = config;

export default config;
