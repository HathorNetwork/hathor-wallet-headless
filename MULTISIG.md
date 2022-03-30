# MultiSig Wallet

This is a how-to of using the wallet-headless as a MultiSig wallet.

## Configuration

Any seed you wish to start as MultiSig should have it's configuration on the `multisig` key of the config file.

Example of a 2-of-4 MultiSig:
```js
...
'multisig': {
  'default': {
    'total': 4,
    'minSignatures': 2,
    'pubkeys': [
      'xpub0...',
      'xpub1...',
      'xpub2...',
      'xpub3...',
    ],
  }
},
...
```
Obs: You can have multiple seeds configured as multisig.

### Docker

When using Docker you need to configure using arguments or environment variables.
Considering the seedKey `abc` the arguments would be:
- `--seed_abc_pubkeys`        or `HEADLESS_SEED_ABC_PUBKEYS`        : Space separated list of participant xpubs
- `--seed_abc_max_signatures` or `HEADLESS_SEED_ABC_MAX_SIGNATURES` : Number of participants
- `--seed_abc_min_signatures` or `HEADLESS_SEED_ABC_MIN_SIGNATURES` : Minimum number of signatures needed to send a transaction

### == IMPORTANT ==

The MultiSig addresses are determined by the participants xpubs AND the minimum number of signatures.
Changing the minimum number of signatures will generate a different MultiSig wallet.

## Collect pubkeys

Configure your wallet normally and use the `/multisig-pubkey` to get your pubkey.
You don't need to start the wallet yet.

### POST /multisig-pubkey

Parameters:

`seedKey`: Parameter to define which seed (from the object seeds in the config file) will be used to generate the pubkey.
`passphrase`: Optional parameter to generate the pubkey with a passphrase. If not sent we use empty string. Should be the same when starting the wallet later.


```bash
$ curl -X POST --data-urlencode "passphrase=123" --data "seedKey=default" http://localhost:8000/multisig-pubkey
{"success":true,"xpubkey":"xpub..."}
```

## Start a MultiSig Wallet

Same as the start on [README.md](./README.md), but include the parameter `"multisig": true` to the request body.

## How to use?

If a participant wishes to send a transaction from the MultiSig wallet funds he should follow these steps:

1. Use the `/wallet/partial-tx` endpoint to get the `txHex` of the desired transaction and send to the participants.
1. Each participant should send the `txHex` to the `/wallet/decode` endpoint to check the transaction.
    1. If approved, the participant should send the `txHex` to the `/wallet/signature` endpoint to get the signatures.
    1. Send the signatures string to the participant who requested the transaction.
1. Once enough signatures are collected the participant who requested the transaction can use the `/wallet/tx-assemble-push` to send the transaction.

## POST /wallet/partial-tx

Create a transaction with multiple inputs and outputs.

You must provide an 'outputs' array in which each element is an object with `address`, `value` and optionally `token` if the output is not for HTR.
The `value` parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.

```bash
$ curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"outputs": [{"address":"WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6","value":1,"token":"00"}]}' http://localhost:8000/wallet/partial-tx
{
    "success": true,
    "txHex": "000100010100c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d10100000000000100001976a914628a732435664063116fec3af91b8bf17e46d3ea88ac7ff8000000000000000000000000000000",
}
```

## POST /wallet/decode

Check what is contained on a transaction hex.

```bash
$ curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data "{\"txHex\":\"{txHex}\"}" http://localhost:8000/wallet/decode
{
  "success": true,
  "tx": {
    "inputs": [
      {
        "txId": "00c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d1",
        "index": 1
      }
    ],
    "outputs": [
      {
        "address": "WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6",
        "value": 1,
        "tokenData": 0
      }
    ]
  }
}
```

## POST /wallet/signature

Get the signatures for the transaction hex.

```bash
$ curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data "{\"txHex\":\"{txHex}\"}" http://localhost:8000/wallet/signature
{
  "success": true,
  "signatures": "...",
}
```

## POST /wallet/tx-assemble-push

Assemble a transaction with the participant signatures and send it to the network.

```bash
$ curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"txHex": "...", "signatures":["sigstr0...","sigstr1..."]}' http://localhost:8000/wallet/tx-assemble-push
{
  "success": true,
  "hash": "00004fb4e4b2db216e6314f1e6e9be73118b3974ea7180044edf5851d0a31045",
  "inputs": [
    {
      "hash": "00c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d1",
      "index": 1,
      "data": {
        "type": "Buffer",
        "data":[...]
      },
      "tx_id": "00c7797738d890d1517f637f2af079d8daa4449fdfd098d2d636bb0e30c809d1"
    }
  ],
  "outputs": [
    {
      "value": 1,
      "script": {
        "type": "Buffer",
        "data": []
      },
      "tokenData": 0,
      "decodedScript": {
        "address": {
          "base58": "WXf4xPLBn7HUC7F1U2vY4J5zwpsDS12bT6",
          "network": {...}
        },
        "timelock": null
      },
      "token_data": 0
    }
  ],
  "version": 1,
  "weight": 17.13552634501032,
  "nonce": 95503,
  "timestamp": 1647035043,
  "parents": [
    "007ae58167abb0e63d6879c437659c7f20ecc8a74531bcc612367735bbc191cc",
    "000489804c1924510d3a2fb5e9a5b71df6e82436dc74fa4b7bfae72bd5502805"
  ],
  "tokens": [],
}
```
