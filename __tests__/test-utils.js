import supertest from "supertest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import app from "../src/index";
import config from "../src/config";
import httpFixtures from "./__fixtures__/http-fixtures";
import wsFixtures from "./__fixtures__/ws-fixtures";
import { Server } from "mock-socket";

const WALLET_ID = "stub_wallet";
const SEED_KEY = "stub_seed";

const request = supertest(app);

const httpMock = new MockAdapter(axios);

const wsUrl = config.server.replace(/https?/, "ws").replace("/v1a", "/v1a/ws");
const wsMock = new Server(wsUrl);

class TestUtils {
  static socket = null;
  static httpMock = httpMock;
  static wsMock = wsMock;

  static walletId = WALLET_ID;

  static addresses = [
    "WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN",
    "WmtWgtk5GxdcDKwjNwmXXn74nQWTPWhKfx",
    "WPynsVhyU6nP7RSZAkqfijEutC88KgAyFc",
    "WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp",
    "WVGxdgZMHkWo2Hdrb1sEFedNdjTXzjvjPi",
    "Wc4dKp6hBgr5PU9gBmzJofc93XZGAEEUXD",
    "WUujvZnk3LMbFWUW7CnZbjn5JZzALaqLfm",
    "WYiD1E8n5oB9weZ8NMyM3KoCjKf1KCjWAZ",
    "WXN7sf6WzhpESgUuRCBrjzjzHtWTCfV8Cq",
    "WYaMN32qQ9CAUNsDnbtwi1U41JY9prYhvR",
    "WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN",
    "WgpRs9NxhkBPxe7ptm9RcuLdABb7DdVUA5",
    "WPzpVP34vx6X5Krj4jeiQz9VW87F4LEZnV",
    "WSn9Bn6EDPSWZqNQdpV3FxGjpTEMsqQHYQ",
    "WmYnieT3vzzY83eHphQHs6HJ5mYyPwcKSE",
    "WZfcHjgkfK9UroTzpiricB6gtg99QKraG1",
    "WiHovoQ5ZLKPpQjZYkLVeoVgP7LoVLK518",
    "Wi5AvNTnh4mZft65kzsRbDYEPGbTRhd5q3",
    "Weg6WEncAEJs5qDbGUxcLTR3iycM3hrt4C",
    "WSVarF73e6UVccGwb44FvTtqFWsHQmjKCt",
    "Wc5YHn861241iLY42mFT8z1dT1UdsNWkfs",
  ];

  static get request() {
    return request;
  }

  static async startWallet({
    seedKey = SEED_KEY,
    walletId = TestUtils.walletId,
  } = {}) {
    TestUtils.walletId = walletId;

    const response = await request
      .post("/start")
      .send({ seedKey: seedKey, "wallet-id": walletId });

    if (response.status !== 200) {
      throw new Error("Unable to start the wallet");
    }
    if (!response.body.success) {
      throw new Error(response.body.message);
    }

    while (true) {
      const res = await request
        .get("/wallet/status")
        .set({ "x-wallet-id": walletId });
      if (res.body && res.body.success !== false) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  static async stopWallet({ walletId = TestUtils.walletId } = {}) {
    await request.post("/wallet/stop").set({ "x-wallet-id": walletId });
  }

  static startMocks() {
    // http mocks
    httpMock.onGet("/version").reply(200, httpFixtures["/v1a/version"]);
    httpMock
      .onGet("/thin_wallet/address_history")
      .reply(200, httpFixtures["/thin_wallet/address_history"]);
    httpMock.onPost("push_tx").reply(200, httpFixtures["/v1a/push_tx"]);
    httpMock.onPost("submit-job").reply(200, httpFixtures["submit-job"]);
    httpMock.onGet("job-status").reply(200, httpFixtures["job-status"]);

    // websocket mocks
    wsMock.on("connection", (socket) => {
      TestUtils.socket = socket;
      socket.send(JSON.stringify(wsFixtures["dashboard"]));
      socket.on("message", (data) => {
        let jsonData = JSON.parse(data);
        if (jsonData.type === "subscribe_address") {
          // Only for testing purposes
          socket.send(
            JSON.stringify({
              type: "subscribe_success",
              address: jsonData.address,
            })
          );
        } else if (jsonData.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
      });
    });
  }

  static stopMocks() {
    httpMock.reset();
    return new Promise((resolve) => wsMock.stop(resolve));
  }

  static reorderHandlers() {
    Object.values(httpMock.handlers).forEach(handler => handler.reverse());
  }
}

export default TestUtils;
