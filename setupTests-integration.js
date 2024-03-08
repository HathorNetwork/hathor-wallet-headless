/* eslint-disable global-require */
import { loggers, LoggerUtil } from './__tests__/integration/utils/logger.util';
import { WalletBenchmarkUtil } from './__tests__/integration/utils/benchmark/wallet-benchmark.util';
import { TxBenchmarkUtil } from './__tests__/integration/utils/benchmark/tx-benchmark.util';
import {
  precalculationHelpers, WalletPrecalculationHelper,
} from './scripts/helpers/wallet-precalculation.helper';
import { TestUtils } from './__tests__/integration/utils/test-utils-integration';

expect.extend({
  toBeInArray(received, expected) {
    let pass;
    if (expected instanceof Array === false) {
      // Expected is not array
      pass = false;
    } else {
      pass = expected.indexOf(received) !== -1;
    }
    const negativeStr = pass ? '' : 'not';
    return {
      message: () => `expected item (${received}) to ${negativeStr} be in Array(${expected})`,
      pass,
    };
  }
});

// Mock config file
jest.mock(
  './src/settings',
  () => {
    let settings = require('./__tests__/integration/configuration/settings-fixture');
    if (settings.default) settings = settings.default;
    return settings;
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
  // Initializing the Transaction Logger with the test name obtained by our jest-circus Custom Env
  const { testName } = global;
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

  await TestUtils.startServer();

  // Await first block to be mined to release genesis reward lock
  try {
    await TestUtils.waitNewBlock();
  } catch (err) {
    // When running jest with jasmine there's a bug (or behavior)
    // that any error thrown inside beforeAll methods don't stop the tests
    // https://github.com/jestjs/jest/issues/2713
    // The solution for that is to capture the error and call process.exit
    // https://github.com/jestjs/jest/issues/2713#issuecomment-319822476
    // The downside of that is that we don't get logs, however is the only
    // way for now. We should stop using jasmine soon (and change for jest-circus)
    // when we do some package upgrades
    process.exit(1);
  }
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

  TestUtils.stopServer();
});
