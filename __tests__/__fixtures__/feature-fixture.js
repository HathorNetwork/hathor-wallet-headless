const constants = {
  MAX_DATA_SCRIPT_LENGTH: 150,

  SWAP_SERVICE_MAINNET_BASE_URL: 'https://atomic-swap-service.mainnet.mock/',
  SWAP_SERVICE_TESTNET_BASE_URL: 'https://atomic-swap-service.testnet.mock/',

  DEFAULT_PASSWORD: '123',
  DEFAULT_PIN: '123',
};

// Allow change config at runtime
global.constants = constants;

export default constants;
