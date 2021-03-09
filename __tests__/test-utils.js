import supertest from "supertest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import app from "../server";
import config from "../config";
import httpFixtures from "./__fixtures__/http-fixtures";
import wsFixtures from "./__fixtures__/ws-fixtures";
import { Server } from "mock-socket";

const WALLET_ID = "stub-wallet";
const SEED_KEY = "stub_seed";

const request = supertest(app);

const httpMock = new MockAdapter(axios);

const wsUrl = config.server.replace(/https?/, "ws").replace("/v1a", "/v1a/ws");
const wsMock = new Server(wsUrl);

class TestUtils {
  walletId = WALLET_ID;

  static get request() {
    return request;
  }

  static async startWallet({
    seedKey = SEED_KEY,
    walletId = TestUtils.walletId,
  } = {}) {
    TestUtils.walletId = walletId;

    TestUtils.startMocks();

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
    await TestUtils.stopMocks();
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
}

export default TestUtils;
