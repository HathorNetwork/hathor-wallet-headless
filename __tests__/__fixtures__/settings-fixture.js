const { cloneDeep } = require('lodash');

const defaultConfig = {
  http_bind_address: 'fakehost',
  http_port: 8001,
  network: 'testnet',
  server: 'http://fakehost:8083/v1a/',
  txMiningUrl: 'http://fake.txmining:8084/',
  fireblocksUrl: 'http://fake-fireblocks-url',
  fireblocksApiKey: 'fake-fireblocks-key',
  fireblocksApiSecret: 'fake-fireblocks-secret',
  hsmHost: 'fake-hsm-host',
  hsmUsername: 'hathor-test',
  hsmPassword: 'hathor-pass',
  seeds: {
    stub_seed:
      'upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind',
  },
  multisig: {},
  tokenUid: '',
  gapLimit: null,
  confirmFirstAddress: null,
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
