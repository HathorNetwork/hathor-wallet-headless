import TestUtils from "./__tests__/test-utils";

// Override Promise finally to avoid node 8 errors
Promise.prototype.finally = Promise.prototype.then;

// Default wallet id
const WALLET_ID = "stub_wallet";

// Mock Websockets
jest.mock("isomorphic-ws", () => require("mock-socket").WebSocket);

// Mock config file
jest.mock(
  "./src/config",
  () => require("./__tests__/__fixtures__/config-fixture"),
  { virtual: true }
);

// Enable features for tests
jest.mock(
  "./src/constants",
  () => require("./__tests__/__fixtures__/feature-fixture"),
  { virtual: true }
);

// Start the stub wallet
beforeAll(async () => {
  TestUtils.startMocks();
  await TestUtils.startWallet({ walletId: WALLET_ID });
});

// Stop the stub wallet
afterAll(async () => {
  await TestUtils.stopWallet({ walletId: WALLET_ID });
  await TestUtils.stopMocks();
});
