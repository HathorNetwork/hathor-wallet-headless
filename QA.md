# Suggested Test Sequence

1. **Configuration**
    1. Fill the fields `network`, `server`, `seeds[default]` and `seeds[test]` in `config.js`, where 'default' has funds and 'test' is a new wallet.
    1. `npm start`.

1. **Start wallet**
    1. Start both wallets with `curl -X POST --data "wallet-id=123" --data "seedKey=default" http://localhost:8000/start` and `curl -X POST --data "wallet-id=456" --data "seedKey=test" http://localhost:8000/start`.
    1. Must receive `{"success":true}`.
    1. Check if it's already loaded with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/status/` and `curl -X GET -H "X-Wallet-Id: 456" http://localhost:8000/wallet/status/`.
    1. Will be ready when the return is `{"statusCode": 3, "statusMessage": "Ready", "serverInfo": null}`.

1. **Operations**
    1. See wallet balance with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/balance`. Response must be `{"available":X,"locked":0}`. And `curl -X GET -H "X-Wallet-Id: 456" http://localhost:8000/wallet/balance`. Response must be `{"available":0,"locked":0}`
    1. See history with `curl -X GET -H "X-Wallet-Id: 456" http://localhost:8000/wallet/tx-history`. Response must be `{}`.
    1. Get an address with `curl -X GET -H "X-Wallet-Id: 456" http://localhost:8000/wallet/address`.
    1. Send 1 HTR to this address. `curl -X POST -H "X-Wallet-Id: 123" --data "address={address}" --data "value=100" http://localhost:8000/wallet/simple-send-tx`.
    1. Validate both wallet balances. The one with id 456 must have 1 HTR and the other must have 1 HTR less than before.
    1. Turn off wifi and turn on back again after some time.
    1. Check both balances again and must be the same.
    1. Get an address with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/address`.
    1. Send the 1 HTR back to the wallet in two different outputs with `curl -X POST -H "X-Wallet-Id: 456" -H "Content-type: application/json" --data '{"outputs": [{"address": address, "value": 50}, {"address": address, "value": 50}]}' http://localhost:8000/wallet/send-tx`.
    1. See history again of the wallet with id 456 and must have 2 transactions.
    1. Check the balance again and it must be updated with 0 available.

1. **Reward lock**
    1. Start a new local node and reduce the reward lock to 3 blocks.
    1. Mine 2 blocks for an address of your wallet started on the headless.
    1. Check balance and see you have 128 HTR locked and 0 available.
    1. Mine 2 more blocks and check your balance. It must have 192 HTR locked and 64 HTR available.
    1. Mine 2 more blocks and you must have 192 HTR locked and 192 available.