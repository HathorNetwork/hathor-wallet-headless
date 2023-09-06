const { cloneDeep } = require('lodash');

const defaultConfig = {
  http_bind_address: 'fakehost',
  http_port: 8001,
  network: 'testnet',
  server: 'http://fakehost:8083/v1a/',
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
  getConfig: () => { return config; },
  // utilities to change the configuration at runtime
  _getDefaultConfig: () => {
    return cloneDeep(defaultConfig);
  },
  _setConfig: c => {
    config = c;
  },
  _resetConfig: () => {
    config = cloneDeep(defaultConfig);
  },
};
