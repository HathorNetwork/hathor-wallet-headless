import TestUtils from "./__tests__/test-utils";

const WALLET_ID = "stub_wallet";

// Mock Websockets
jest.mock("isomorphic-ws", () => require("mock-socket").WebSocket);

// Mock config file
jest.mock(
  "./src/config",
  () => require("./__tests__/__fixtures__/config-fixture"),
  { virtual: true }
);

// Start the stub wallet
beforeAll(async () => {
  await TestUtils.startWallet({ walletId: WALLET_ID });
});

// Stop the stub wallet
afterAll(async () => {
  await TestUtils.stopWallet({ walletId: WALLET_ID });
});
