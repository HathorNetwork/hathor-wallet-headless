import supertest from "supertest";
import app from "../src/index";
import config from "../src/config";

const request = supertest(app);


// const wsUrl = config.server.replace(/https?/, "ws").replace("/v1a", "/v1a/ws");

/**
 * @typedef WalletData
 * @property {string} walletId Id for interacting with the wallet
 * @property {string} words 24 word seed for the wallet
 * @property {string[]} addresses Some sample addresses to help with testing
 */

/**
 * @type {Record<string,WalletData>}
 */
export const WALLET_CONSTANTS = {
  genesis: {
    walletId: 'genesiswallet',
    words: 'avocado spot town typical traffic vault danger century property shallow divorce festival spend attack anchor afford rotate green audit adjust fade wagon depart level'
  },
  second: {
    walletId: 'secondwallet',
    words: 'scare more mobile text erupt flush paper snack despair goddess route solar keep search result author bounce pulp shine next butter unknown frozen trap'
  }
}

export class TestUtils {
  static get request() {
    return request;
  }

  /**
   *
   * @param {WalletData} walletObj
   * @returns {Promise<{start:unknown,status:unknown}>}
   */
  static async startWallet(walletObj) {
    let start, status

    // Start the wallet
    const response = await request
      .post("/start")
      .send({ seed: walletObj.words, "wallet-id": walletObj.walletId });

    if (response.status !== 200) {
      throw new Error(`Unable to start the wallet: ${walletObj.walletId}`);
    }
    if (!response.body.success) {
      console.error(`Failure starting the wallet: ${response.body.message}`)
      throw new Error(response.body.message);
    }
    start = response.body

    // Wait until the wallet is actually started
    while (true) {
      const res = await request
        .get("/wallet/status")
        .set({ "x-wallet-id": walletObj.walletId });
      if (res.body && res.body.success !== false) {
        status = res.body
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { start, status }
  }

  static async stopWallet(walletId) {
    await request.post("/wallet/stop").set({ "x-wallet-id": walletId });
  }
}
