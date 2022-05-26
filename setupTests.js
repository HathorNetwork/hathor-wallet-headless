/* eslint-disable import/no-extraneous-dependencies,global-require */
import TestUtils from './__tests__/test-utils';

// Override Promise finally to avoid node 8 errors
// eslint-disable-next-line no-extend-native
Promise.prototype.finally = Promise.prototype.then;

// Mock Websockets
jest.mock('isomorphic-ws', () => require('mock-socket').WebSocket);

// Mock config file
jest.mock(
  './src/config',
  () => {
    let config = require('./__tests__/__fixtures__/config-fixture');
    if (config.default) config = config.default;
    return config;
  },
  { virtual: true }
);

// Enable features for tests
jest.mock(
  './src/constants',
  () => {
    let fixture = require('./__tests__/__fixtures__/feature-fixture');
    if (fixture.default) fixture = fixture.default;
    return fixture;
  },
  { virtual: true }
);

// Start the stub wallet
beforeAll(async () => {
  TestUtils.startMocks();
});

// Stop the stub wallet
afterAll(async () => {
  await TestUtils.stopMocks();
});
