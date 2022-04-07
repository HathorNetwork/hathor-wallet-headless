/* eslint-disable global-require */
import { parse } from 'path';
import { loggers, TxLogger } from './__tests__/integration/txLogger';

/**
 * Gets the name of the test being executed from a Jasmine's global variable.
 * @returns {string} Test name
 */
function getTestNameFromGlobalJasmineInstance() {
  // eslint-disable-next-line no-undef
  const { testPath } = jasmine;
  const testFileName = parse(testPath).name;
  return testFileName.indexOf('.') > -1
    ? testFileName.split('.')[0]
    : testFileName;
}

// Mock config file
jest.mock(
  './src/config',
  () => {
    let config = require('./__tests__/integration/configuration/config-fixture');
    if (config.default) config = config.default;
    return config;
  },
  { virtual: true },
);

// Enable features for tests
jest.mock(
  './src/constants',
  () => {
    let config = require('./__tests__/__fixtures__/feature-fixture');
    if (config.default) config = config.default;
    return config;
  },
  { virtual: true },
);

// This function will run before each test file is executed
beforeAll(async () => {
  // Initializing the Transaction Logger with the test name
  const testName = getTestNameFromGlobalJasmineInstance();
  const testLogger = new TxLogger(testName);
  testLogger.init();
  loggers.test = testLogger;
});
