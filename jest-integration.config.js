// Minor helper for test development. Allows for specific file testing.
const specificTestFile = process.env.SPECIFIC_INTEGRATION_TEST_FILE;
const mainTestMatch = specificTestFile
  ? `<rootDir>/__tests__/integration/**/${specificTestFile}.test.js`
  : '<rootDir>/__tests__/integration/**/*.test.js';

// The shielded suites need the shielded fullnode of docker-compose-shielded.yml,
// so the default run leaves them out: they run with `npm run test_shielded_integration`
const testPathIgnorePatterns = specificTestFile
  ? ['/node_modules/']
  : ['/node_modules/', '<rootDir>/__tests__/integration/shielded-'];

module.exports = {
  testRunner: 'jest-circus/runner',
  clearMocks: true,
  coverageDirectory: 'coverage-integration',
  testEnvironment: './CustomEnvironment.js',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  testMatch: [mainTestMatch],
  testPathIgnorePatterns,
  coverageReporters: ['text-summary', 'lcov', 'clover'],
  // 60 minutes - increased due to large test files like create-token.test.js
  testTimeout: 60 * 60 * 1000,
  setupFilesAfterEnv: ['<rootDir>/setupTests-integration.js'],
};
