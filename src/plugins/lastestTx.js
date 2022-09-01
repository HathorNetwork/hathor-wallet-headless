/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const init = async (bus, app) => {
  const latestTxs = {};
  bus.on('wallet:new-tx', data => {
    latestTxs[data.walletId] = data.tx;
  });

  bus.on('conn:wallet-load-partial-update', data => {
    const { walletId, wsData } = data;
    const { historyTransactions } = wsData;

    console.log(JSON.stringify(historyTransactions));
    if (!historyTransactions) {
      return;
    }

    const gotTx = latestTxs[walletId];

    let maxTs = (gotTx && gotTx.timestamp) || 0;
    let mostRecentTx = null;
    for (const tx of Object.values(historyTransactions)) {
      if (tx.timestamp >= maxTs) {
        maxTs = tx.timestamp;
        mostRecentTx = tx;
      }
    }

    if (mostRecentTx !== null) {
      latestTxs[walletId] = mostRecentTx;
    }
  });

  // conn:wallet-load-partial-update

  app.get('/custom/latest-tx', (req, res) => {
    const walletId = req.query.id;
    if (!walletId) {
      res.status(400).json({ success: false, error: 'Missing id parameter' });
      return;
    }

    const tx = latestTxs[walletId];
    if (!tx) {
      res.status(404).json({ success: false, message: 'tx not found' });
      return;
    }

    res.send({ success: true, tx });
  });
};
