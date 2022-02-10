import {TestUtils, WALLET_CONSTANTS} from "./__tests__/integration/test-utils-integration";
import {loggers, TxLogger} from "./__tests__/integration/txLogger";
import * as Path from 'path';

// const {WebSocket} = require("mock-socket");
// const jest = require('jest')

// Mock Websockets
// jest.mock("isomorphic-ws", () => WebSocket);

function getTestNameFromGlobalJasmineInstance() {
  const testPath = jasmine.testPath
  const testFileName = Path.parse(testPath).name
  return testFileName.indexOf('.') > -1
    ? testFileName.split('.')[0]
    : testFileName
}

// Start the stub wallet
beforeAll(async () => {
  const testName = getTestNameFromGlobalJasmineInstance()
  const testLogger = new TxLogger(testName);
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
