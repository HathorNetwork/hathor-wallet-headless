# QA (quality assurance)

## Purpose

To define a test sequence.

## Suggested test sequence

1. **Configuration**
    1. Create a new seed running `npm run generate_words`.
    1. Fill the fields `network: 'testnet'`, `server: 'https://node1.testnet.hathor.network/v1a/'`, `seeds[qa]: generated_words` in `src/config.js`.
    1. `npm start`.

1. **Start wallet**
    1. Start the wallet with `curl -X POST --data "wallet-id=123" --data "seedKey=qa" http://localhost:8000/start`.
    1. Must receive `{"success":true}`.
    1. Check if it's already loaded with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/status/`.
    1. Will be ready when the return is `{"statusCode": 3, "statusMessage": "Ready", "serverInfo": null}`.

1. **Operations**
    1. See wallet balance with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/balance`. Response must be `{"available": 0,"locked": 0}`.
    1. Get an address with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/address`.
    1. Send 1.00 HTR to this address from another wallet.
    1. Check that the balance now is `{"available": 100,"locked": 0}`.
    1. Turn off wifi and turn on back again after some time.
    1. Check the balance again and must be the same.
    1. Get the index of the address you sent the HTR above with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/address-index?address=<ADDRESS>`. It must return `{"success":true,"index":0}`.
    1. Get all addresses of the wallet with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/addresses`. It must return `{"addresses": ARRAY}`. The array must have 21 addresses and the first one must the the same as above.
    1. Get one address of another wallet to send 0.1 HTR back. `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"address": <address>, "value": 10}' http://localhost:8000/wallet/simple-send-tx`. It must return `{"success":true, ...}` and the tx data. Get the hash of the response.
    1. Get this new transaction with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/transaction?id=<HASH>`. It must return `{"success": true, ...}` with the transaction info.
    1. Send another transaction to your other wallet splitting in two outputs. `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"outputs": [{"address": <address>, "value": 5}, {"address": <address>, "value": 5}]}' http://localhost:8000/wallet/send-tx`. It must return success true with the transaction data.
    1. Check the balance again and must be available: 80.
    1. Get the history with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/tx-history` and must return the 3 transactions. Now get it with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/tx-history?limit=2` and it must return only the 2 newest txs.
    1. Get information about an address with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/address-info?address=<address>` with the address at index 0 we sent the first tx. It must return `{"success":true,"total_amount_received":100,"total_amount_sent":100,"total_amount_available":0,"total_amount_locked":0,"token":"00","index":0}`.
    1. Now send the same request but with an address of another wallet. It must return `{"success":false,"error":"Address does not belong to this wallet."}`.
    1. Get the utxos available with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/utxo-filter`. It must return `{"total_amount_available":80,"total_utxos_available":1,"total_amount_locked":0,"total_utxos_locked":0,"utxos":[{"address": <address>, "amount": 80,"tx_id": <tx_id>, "locked":false,"index":0}]}`.
    1. Get two new addresses of your wallet with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/address?mark_as_used=true`. Send a transaction with two outputs `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"outputs": [{"address": <address1>, "value": 40}, {"address": <address2>, "value": 40}]}' http://localhost:8000/wallet/send-tx`.
    1. Now request utxo filter again and must return 2 available utxos. `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/utxo-filter`.
    1. Get an address from another wallet and call `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"destination_address": <address>}' http://localhost:8000/wallet/utxo-consolidation`. It must return `{"success":false,"error":"Utxo consolidation to an address not owned by this wallet isn't allowed."}`.
    1. Now send the same request but using an address from the wallet. It must return success true with the information about the consolidation.
    1. Now request utxo filter again and must return 1 available utxo that belongs to the address sent above. `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/utxo-filter`.
    1. Now we will send a transaction with a query filter as inputs. We use the first address of the wallet that does not have utxos available to get an error.  `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"inputs": [{"type": "query", "filter_address": <first_address_of_wallet>}], "outputs": [{"address": <your_address>, "value": 5}]}' http://localhost:8000/wallet/send-tx`. It must return `{"success":false,"error":"No utxos available for the query filter for this amount."}`.
    1. Now we send the same request but with the correct address that has the available utxos. `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"inputs": [{"type": "query", "filter_address": <address_with_available_utxo>}], "outputs": [{"address": <your_address>, "value": 5}]}' http://localhost:8000/wallet/send-tx`. It must return success true with the transaction detail.
    1. Send transaction selecting input that was already spent. Get the last sent transaction with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/tx-history?limit=1` and get the tx hash and index used in this transaction. Use this value to try to send a tx with `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"inputs": [{"hash": <tx_hash>, "index": <input_index>}], "outputs": [{"address": <your_address>, "value": 5}]}' http://localhost:8000/wallet/send-tx`. It must return an error that the input is already spent.
    1. Send transaction selecting valid input now (you can get a valid utxo with the utxo-filter API) and should return success true.
    1. Now we will create a new token with `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"name": "Test Token", "symbol": "TST", "amount": 100, "address": <first_address>}' http://localhost:8000/wallet/create-token`. It must return success true and check that the utxo is available with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/utxo-filter?token=<TOKEN_UID>` and validate the utxo is from the address used in the request. The token_uid is the hash of the transaction created in the first request.
    1. Now we will mint more tokens with `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"token": <TOKEN_UID>, "amount": 100}' http://localhost:8000/wallet/mint-tokens`. Now check the balance with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/balance?token=<TOKEN_UID>` the balance must be 200.
    1. Now we will melt tokens with `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"token": <TOKEN_UID>, "amount": 100}' http://localhost:8000/wallet/melt-tokens`. Now check the balance with `curl -X GET -H "X-Wallet-Id: 123" http://localhost:8000/wallet/balance?token=<TOKEN_UID>` the balance must be 100.
    1. Now we will create an NFT. `curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"name": "Test Token", "symbol": "TST", "amount": 1, "data": "nft data", "address": <first_address>}' http://localhost:8000/wallet/create-nft`. The response must be success true and the created transactions data.
