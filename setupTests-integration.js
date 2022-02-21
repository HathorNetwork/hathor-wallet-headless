import {TestUtils, WALLET_CONSTANTS} from "./__tests__/integration/test-utils-integration";
import {loggers, TxLogger} from "./__tests__/integration/txLogger";
import * as Path from 'path';

// const {WebSocket} = require("mock-socket");
// const jest = require('jest')

// Mock Websockets
// jest.mock("isomorphic-ws", () => WebSocket);

/**
 * Gets the name of the test being executed from a Jasmine's global variable.
 * @returns {string} Test name
 */
function getTestNameFromGlobalJasmineInstance() {
  const testPath = jasmine.testPath
  const testFileName = Path.parse(testPath).name
  return testFileName.indexOf('.') > -1
    ? testFileName.split('.')[0]
    : testFileName
}

// This function will run before each test file is executed
beforeAll(async () => {
  // Initializing the Transaction Logger with the test name
  const testName = getTestNameFromGlobalJasmineInstance()
  const testLogger = new TxLogger(testName);
  await testLogger.init(__dirname);
  loggers.test = testLogger;

  await TestUtils.startWallet(WALLET_CONSTANTS.genesis);
});

// This function will run after each test file is executed
afterAll(async () => {
  await TestUtils.stopWallet(WALLET_CONSTANTS.genesis.walletId);
});
