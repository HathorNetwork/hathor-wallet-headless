// Mock Websockets
jest.mock(
  "isomorphic-ws",
  () => require("mock-socket").WebSocket
);

// Mock config file
jest.mock(
  "./config",
  () => require("./__tests__/__fixtures__/config-fixture"),
  { virtual: true }
);
