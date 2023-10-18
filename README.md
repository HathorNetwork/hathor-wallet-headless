[![codecov](https://codecov.io/gh/HathorNetwork/hathor-wallet-headless/branch/master/graph/badge.svg?token=NZ3BPUX9V7)](https://codecov.io/gh/HathorNetwork/hathor-wallet-headless)
# Hathor Wallet Headless

This is a headless Hathor Wallet, i.e., without a graphical user interface. It is controlled by its HTTP API.

It may be used both by mining pools and exchanges.

## Requirements

* [Node.js](https://nodejs.org/): We recommend and test with version >= 14.0.0, but version >= 10.0.0 will also probably work. Do not use versions < 10.0.0, they are known to have issues.

## How to run?

Copy `config.js.template` to `src/config.js`, and then fill in the variables. Finally, run `npm start`.

## Authentication

You can enable a simple API Key verification in the `config.js` file. In this case, your requests must include the header `X-API-KEY` with the correct key.

If you are using cURL to test, you can include the header using the `-H` parameter, e.g., `curl -H "X-API-Key: YourKey" http://localhost:8000/wallet/balance`.

It follows the [Swagger Specification for API Keys](https://swagger.io/docs/specification/authentication/api-keys/).

## How to use?

Check out the full documentation in the OpenAPI Documentation in `api-docs.js` or see below for how to [Evaluate API Docs](#evaluate-api-docs).

### Start a wallet

Create and start a new wallet.

Parameters:

`wallet-id`: key reference of this wallet in the object of created wallets. Used to say which wallet each request is directed to.
`passphrase`: Optional parameter to start the wallet with a passphrase. If not sent we use empty string.
`seedKey`: Parameter to define which seed (from the object seeds in the config file) will be used to generate the wallet.
`multisig`: Optional boolean parameter to start the wallet as a MultiSig wallet. Requires proper configuration.

```bash
$ curl -X POST --data "wallet-id=id" --data-urlencode "passphrase=123" --data "seedKey=default" http://localhost:8000/start
{"success":true}
```

**All requests below must have a header 'X-Wallet-Id' to indicate which wallet should be used.**

On the examples, replace `{wallet-id}` with the desired id.

### Wallet status

```bash
$ curl -X GET -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/status/
{
    "statusCode": 3,
    "statusMessage": "Ready",
    "network": "testnet",
    "serverUrl": "http://localhost:8083/v1a/",
    "serverInfo": {
        "version": "0.31.1",
        "network": "testnet-delta",
        "min_weight": 14,
        "min_tx_weight": 14,
        "min_tx_weight_coefficient": 1.6,
        "min_tx_weight_k": 100,
        "token_deposit_percentage": 0.01,
        "reward_spend_min_blocks": 3,
        "max_number_inputs": 255,
        "max_number_outputs": 255
    }
}
```

### Get balance

```bash
$ curl -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/balance
{"available":2,"locked":0}
```

To get the balance of a custom token:
```bash
$ curl -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/balance?token=<token_uid>
{"available":2,"locked":0}
```

### Get an address

You can either mark as used or not. If you don't, it will return the same address until at least one transaction arrives to that address. If you mark as used, it will return a new address in the next call.

```bash
$ curl -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/address
{"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
$ curl -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/address
{"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
$ curl -H "X-Wallet-Id: {wallet-id}" "http://localhost:8000/wallet/address?mark_as_used"
{"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
] curl -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/address
{"address":"HCAQb2H5EUqv9AoThwHQcibZe5nvppscMh"}
```

### Simple send tx

Send a transaction to exactly one output. You must provide both the `address` and the `value`. The `value` parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.

```bash
$ curl -X POST -H "X-Wallet-Id: {wallet-id}" --data "address=H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt" --data "value=101" http://localhost:8000/wallet/simple-send-tx
{
  "success": true,
  "message": "",
  "tx": {
    "hash": "00001bc7043d0aa910e28aff4b2aad8b4de76c709da4d16a48bf713067245029",
    "nonce": 33440807,
    "timestamp": 1579656120,
    "version": 1,
    "weight": 16.827294220302488,
    "parents": [
      "000036e846dee9f58a724543cf5ee14cf745286e414d8acd9563963643f8dc34",
      "000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29"
    ],
    "inputs": [
      {
        "tx_id": "000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29",
        "index": 0,
        "data": "RzBFAiEAyKKbtzdH7FjvjUopHFIXBf+vBcH+2CKirp0mEnLjjvMCIA9iSuW4B/UJMQld+c4Ch5lIwAcTbzisNUaCs+JpK8yDIQI2CLavb5spKwIEskxaVu0B2Tp52BXas3yjdX1XeMSGyw=="
      }
    ],
    "outputs": [
      {
        "value": 1,
        "token_data": 0,
        "script": "dqkUtK1DlS8IDGxtJBtRwBlzFWihbIiIrA=="
      }
    ],
    "tokens": []
  }
}
```

### Send transactions with many outputs

Send a transaction with many outputs. You must provide an 'outputs' array in which each element is an object with `address` and `value`. The `value` parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.

```bash
$ curl -X POST -H "X-Wallet-Id: 123" -H "Content-type: application/json" --data '{"outputs": [{"address": "H9YHCqJNfep3VBMMPZBAL7w1wh9ztRRbGo", "value": 100}, {"address": "HN152wFDgy7ZopSf6PpSFMt8M8r2Mz9fGc", "value": 200}]}' http://localhost:8000/wallet/send-tx
{
    "success": true,
    "message": "",
    "return_code": "success",
    "tx": {
        "hash": "00000000059dfb65633acacc402c881b128cc7f5c04b6cea537ea2136f1b97fb",
        "nonce": 2455281664,
        "timestamp": 1594955941,
        "version": 1,
        "weight": 18.11897634891149,
        "parents": [
            "00000000556bbfee6d37cc099a17747b06f48ca3d9bf4af85c707aa95ad04b3f",
            "00000000e2e3e304e364edebff1c04c95cc9ef282463295f6e417b85fec361dd"
        ],
        "inputs": [
            {
                "tx_id": "00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65",
                "index": 1,
                "data": "RjBEAiAYR8jc+zqY596QyMp+K3Eag3kQB5aXdfYja19Fa17u0wIgCdhBQpjlBiAawP/9WRAqAzW85CJlBpzq+YVhUALg8IUhAueFQuEkAo+s2m7nj/hnh0nyphcUuxa2LoRBjOsEOHRQ"
            },
            {
                "tx_id": "00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65",
                "index": 2,
                "data": "RzBFAiEAofVXnCKNCEu4GRk7j+wHpQM6qmezRcfxHCe/PcUdbegCIE2nip27ZQtkpkEgNEhycqHM4CkLYMLVUgskphYsd/M9IQLHG6YJxXifQ6eMxPHbINFEJAUvrzKWe9V7AXXW4iywjg=="
            }
        ],
        "outputs": [
            {
                "value": 100,
                "token_data": 0,
                "script": "dqkUqdK8VisGSJuNItIBRYFfSHfHjPeIrA=="
            },
            {
                "value": 200,
                "token_data": 0,
                "script": "dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA=="
            }
        ],
        "tokens": []
    }
}
```

### Get tx history

```bash
$ curl -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/tx-history
{
  "0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11": {
    "tx_id": "0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11",
    "version": 1,
    "timestamp": 1578430704,
    "is_voided": false,
    "inputs": [
      {
        "value": 1,
        "token_data": 0,
        "script": "dqkU98E1NAiRn3fV4nBm1S3e5pPssF+IrA==",
        "decoded": {
          "type": "P2PKH",
          "address": "HV78k3MkUmt6no59cV1kCJzo2CfPXGNmRv",
          "timelock": null
        },
        "token": "00",
        "tx_id": "00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430",
        "index": 1
      },
      {
        "value": 2,
        "token_data": 0,
        "script": "dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==",
        "decoded": {
          "type": "P2PKH",
          "address": "HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe",
          "timelock": null
        },
        "token": "00",
        "tx_id": "0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c",
        "index": 1
      }
    ],
    "outputs": [
      {
        "value": 3,
        "token_data": 0,
        "script": "dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==",
        "decoded": {
          "type": "P2PKH",
          "address": "H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP",
          "timelock": null
        },
        "token": "00",
        "spent_by": "000008d7e62d394be9b07c0fe9c69b289e44dbe1350e2100c169fc030ac936ff"
      }
    ],
    "parents": [
      "0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c",
      "00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430"
    ]
  },
  "0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c": {
    "tx_id": "0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c",
    "version": 1,
    "timestamp": 1578430668,
    "is_voided": false,
    "inputs": [
      {
        "value": 4398,
        "token_data": 0,
        "script": "dqkUfZRahPx5JF7l8qFzwVjiV1tmhweIrA==",
        "decoded": {
          "type": "P2PKH",
          "address": "HHy8a7QvQmj727beKFuiYziGb7mi7CdrG3",
          "timelock": null
        },
        "token": "00",
        "tx_id": "00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430",
        "index": 0
      }
    ],
    "outputs": [
      {
        "value": 4396,
        "token_data": 0,
        "script": "dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==",
        "decoded": {
          "type": "P2PKH",
          "address": "H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP",
          "timelock": null
        },
        "token": "00",
        "spent_by": "00000174753194de2affba45874ef36c92e0ae270442f2410207cf2ee3d06950"
      },
      {
        "value": 2,
        "token_data": 0,
        "script": "dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==",
        "decoded": {
          "type": "P2PKH",
          "address": "HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe",
          "timelock": null
        },
        "token": "00",
        "spent_by": "0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11"
      }
    ],
    "parents": [
      "00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430",
      "000009fe61f75076b0c1abde1ee1881e4886bad80a09e699cb599b538934ce33"
    ]
  }
}
```

### Stop a wallet

Stop the wallet and its connections and remove it from the available wallets.

```bash
$ curl -X POST -H "X-Wallet-Id: {wallet-id}" http://localhost:8000/wallet/stop
{"success":true}
```

## Util scripts

### Generate new words

This script generates a new seed with 24 words. It is useful when you'd like to start a brand new wallet. The seed is a sensitive data that cannot be shared with anyone else. Remember to clean up your clipboard after copying & pasting.

```bash
$ npm run generate_words

work above economy captain advance bread logic paddle copper change maze tongue salon sadness cannon fish debris need make purpose usage worth vault shrug
```

### Evaluate API Docs

This script generates a fully interactive webpage containing the documentation of the API. It is useful to check if the documentation is correct and up-to-date in a human friendly interface.

This feature requires NodeJS v16 or greater and the [`redocly/cli`](https://github.com/Redocly/redocly-cli) library installed globally:
```bash
# Validate the generated docs according to Redocly rules and visualize them
npm run docs
```

For a machine-readable version of the API docs, start the Headless wallet and use the `[GET] /docs` endpoint.

## Multisig

Check out how to configure and use as a MultiSig wallet on [MULTISIG.md](./MULTISIG.md)

## Testing

This application has two different contexts for testing.
Refer to [TESTING.md](./TESTING.md) for more information on this.

## Plugin

A plugin receives real-time events from the loaded wallets and can do anything with them.

The plugin system is better described on [PLUGIN.md](./PLUGIN.md).
