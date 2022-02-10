import {TestUtils, WALLET_CONSTANTS} from "./__tests__/integration/test-utils-integration";
import {TxLogger, loggers} from "./__tests__/integration/txLogger";

// const {WebSocket} = require("mock-socket");
// const jest = require('jest')

// Mock Websockets
// jest.mock("isomorphic-ws", () => WebSocket);

// Start the stub wallet
beforeAll(async () => {
  const testLogger = new TxLogger();
  await testLogger.init(__dirname);
  loggers.test = testLogger;

  await TestUtils.startWallet(WALLET_CONSTANTS.genesis);
  await TestUtils.startWallet(WALLET_CONSTANTS.second);
});

// Stop the stub wallet
afterAll(async () => {
  await TestUtils.stopWallet(WALLET_CONSTANTS.genesis.walletId);
  await TestUtils.stopWallet(WALLET_CONSTANTS.second.walletId);
});
