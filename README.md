# Hathor Wallet Headless

This is a headless Hathor Wallet, i.e., without a graphical user interface. It is controlled by its HTTP API.

It may be used both by mining pools and exchanges.

## How to run?

Copy `config.js.template` to `config.js`, and then fill in the variables. Finally, run `npm start`.

## Authentication

You can enable a simple API Key verification in the `config.js` file. In this case, your requests must include the header `X-API-KEY` with the correct key.

If you are using cURL to test, you can include the header using the `-H` parameter, e.g., `curl -H "X-API-Key: YourKey" http://localhost:8000/0/balance`.

It follows the [Swagger Specification for API Keys](https://swagger.io/docs/specification/authentication/api-keys/).

## How to use?

Check out the full documentation in the OpenAPI Documentation in `api-docs.js`.

### Get balance

```bash
$ curl http://localhost:8000/0/balance
{"available":2,"locked":0}
```

### Get an address

You can either mark as used or not. If you don't, it will return the same address until at least one transaction arrives to that address. If you mark as used, it will return a new address in the next call.

```bash
$ curl http://localhost:8000/0/address
{"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
$ curl http://localhost:8000/0/address
{"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
$ curl "http://localhost:8000/0/address?mark_as_used"
{"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
] curl http://localhost:8000/0/address
{"address":"HCAQb2H5EUqv9AoThwHQcibZe5nvppscMh"}
```

### Simple send tx

Send a transaction to exactly one output. You must provide both the `address` and the `value`. The `value` parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.

```bash
$ curl -X POST --data "address=H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt" --data "value=101" http://localhost:8000/0/simple-send-tx
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

### Get tx history

```bash
$ curl http://localhost:8000/0/tx-history
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
