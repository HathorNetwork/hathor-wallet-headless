// Minor helper for test development. Allows for specific file testing.
const mainTestMatch = process.env.SPECIFIC_INTEGRATION_TEST_FILE
  ? `<rootDir>/__tests__/integration/**/${process.env.SPECIFIC_INTEGRATION_TEST_FILE}.test.js`
  : '<rootDir>/__tests__/integration/**/*.test.js';

module.exports = {
  testRunner: 'jest-circus/runner',
  clearMocks: true,
  coverageDirectory: 'coverage-integration',
  testEnvironment: './CustomEnvironment.js',
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.js'],
  testMatch: [mainTestMatch],
  coverageReporters: ['text-summary', 'lcov', 'clover'],
  // 60 minutes - increased due to large test files like create-token.test.js
  testTimeout: 60 * 60 * 1000,
  setupFilesAfterEnv: ['<rootDir>/setupTests-integration.js'],
};
