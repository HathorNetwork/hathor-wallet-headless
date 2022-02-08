import TestUtils from "./__tests__/test-utils-integration";
// const {WebSocket} = require("mock-socket");
// const jest = require('jest')

// Mock Websockets
// jest.mock("isomorphic-ws", () => WebSocket);

// Start the stub wallet
beforeAll(async () => {
  // TestUtils.startMocks();
  // await TestUtils.startWallet({ walletId: WALLET_ID });
});

// Stop the stub wallet
afterAll(async () => {
  // await TestUtils.stopWallet({ walletId: WALLET_ID });
  // await TestUtils.stopMocks();
});
