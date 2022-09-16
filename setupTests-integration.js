/* eslint-disable global-require */
import { parse } from 'path';
import { loggers, LoggerUtil } from './__tests__/integration/utils/logger.util';
import { WalletBenchmarkUtil } from './__tests__/integration/utils/benchmark/wallet-benchmark.util';
import { TxBenchmarkUtil } from './__tests__/integration/utils/benchmark/tx-benchmark.util';
import {
  precalculationHelpers, WalletPrecalculationHelper,
} from './scripts/helpers/wallet-precalculation.helper';

expect.extend({
  toBeInArray(received, expected) {
    let pass;
    if (expected instanceof Array === false) {
      // Expected is not array
      pass = false;
    } else {
      pass = expected.indexOf(received) !== -1;
    }
    if (pass) {
      return {
        message: () => `expected item (${received}) to not be in Array(${expected})`,
        pass: true,
      };
    }
    return {
      message: () => `expected item (${received}) to be in Array(${expected})`,
      pass: false,
    };
  }
});

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
  const testLogger = new LoggerUtil(testName);
  testLogger.init({ filePrettyPrint: true });
  loggers.test = testLogger;

  // Initializing wallet benchmark logger
  const walletBenchmarkLog = new LoggerUtil(
    'wallet-benchmark',
    { reusableFilename: true }
  );
  walletBenchmarkLog.init();
  loggers.walletBenchmark = walletBenchmarkLog;

  // Initializing transaction benchmark logger
  const txBenchmarkLog = new LoggerUtil(
    'tx-benchmark',
    { reusableFilename: true }
  );
  txBenchmarkLog.init();
  loggers.txBenchmark = txBenchmarkLog;

  // Loading pre-calculated wallets
  precalculationHelpers.test = new WalletPrecalculationHelper('./tmp/wallets.json');
  await precalculationHelpers.test.initWithWalletsFile();
});

afterAll(async () => {
  // Calculating wallets benchmark summary
  await WalletBenchmarkUtil.logResults();

  // Calculating transactions benchmark summary
  const txSummary = TxBenchmarkUtil.calculateSummary();
  loggers.test.insertLineToLog('Transaction summary', { txSummary });
  await TxBenchmarkUtil.logResults();

  // Storing data about used precalculated wallets for the next test suites
  await precalculationHelpers.test.storeDbIntoWalletsFile();
});
