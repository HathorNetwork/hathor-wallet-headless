
const apiDoc = {
  openapi: '3.0.0',
  servers: [
    { url: "http://localhost:8000" }
  ],
  info: {
    title: 'Headless Hathor Wallet API',
    description: 'This wallet is fully controlled through an HTTP API.',
    version: '0.1.0',
  },
  produces: [ "application/json" ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        'in': 'header',
        name: 'X-API-KEY',
      },
    },
  },
  security: {
    ApiKeyAuth: [],
  },
  paths: {
    '/start': {
      post: {
        summary: 'Create and start a wallet and add to store.',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'body',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'passphrase',
            'in': 'body',
            description: 'Passphrase of the wallet that will be created.',
            required: false,
            schema: {
              type: 'string',
              default: '',
            },
          },
          {
            name: 'seedKey',
            'in': 'body',
            description: 'Key of the corresponding seed in the config file to create the wallet.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Stop a wallet',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {"success":true},
                  },
                  'seed-not-found': {
                    summary: 'Seed key sent does not exist in config file.',
                    value: {"success":false,"message":"Seed not found."}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'start-failed': {
                    summary: 'Wallet failed to start.',
                    value: {"success":false,"message":"Failed to start wallet with id X"}
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/status': {
      get: {
        summary: 'Return the wallet status',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'query',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'A JSON with general wallet info',
            content: {
              'application/json': {
                examples: {
                  closed: {
                    summary: 'Wallet is closed',
                    value: {"statusCode":0,"statusMessage":"Closed","network":"mainnet","serverUrl":"https://node2.mainnet.hathor.network/v1a/","serverInfo":null}
                  },
                  connecting: {
                    summary: 'Wallet is connecting',
                    value: {"statusCode":1,"statusMessage":"Connecting","network":"mainnet","serverUrl":"https://node2.mainnet.hathor.network/v1a/","serverInfo":null}
                  },
                  syncing: {
                    summary: 'Wallet is syncing',
                    value: {"statusCode":2,"statusMessage":"Syncing","network":"mainnet","serverUrl":"https://node2.mainnet.hathor.network/v1a/","serverInfo":{"version":"0.29.0","network":"mainnet","min_weight":14,"min_tx_weight":14,"min_tx_weight_coefficient":1.6,"min_tx_weight_k":100,"token_deposit_percentage":0.01}}
                  },
                  ready: {
                    summary: 'Wallet is ready',
                    value: {"statusCode":3,"statusMessage":"Ready","network":"mainnet","serverUrl":"https://node2.mainnet.hathor.network/v1a/","serverInfo":{"version":"0.29.0","network":"mainnet","min_weight":14,"min_tx_weight":14,"min_tx_weight_coefficient":1.6,"min_tx_weight_k":100,"token_deposit_percentage":0.01}}
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: {"success":false,"message":"Wallet is not ready.","state":1}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: {"success":false,"message":"Invalid wallet-id parameter."}
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/balance': {
      get: {
        summary: 'Return the balance of HTR',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'query',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Balance of tokens available and locked. To get the total, you must sum them up.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {"available":2,"locked":0}
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: {"success":false,"message":"Wallet is not ready.","state":1}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: {"success":false,"message":"Invalid wallet-id parameter."}
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/address': {
      get: {
        summary: 'Return the current address',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'query',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'mark_as_used',
            'in': 'query',
            description: 'Mark the current address as used. So, it will return a new address in the next call.',
            required: false,
            schema: {
              type: 'boolean',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return the current address',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {"address":"H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt"}
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: {"success":false,"message":"Wallet is not ready.","state":1}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: {"success":false,"message":"Invalid wallet-id parameter."}
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/simple-send-tx': {
      post: {
        summary: 'Send a transaction to exactly one output.',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'body',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'address',
            'in': 'formData',
            description: 'The destination address',
            required: true,
            type: 'string',
          },
          {
            name: 'value',
            'in': 'formData',
            description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.',
            required: true,
            type: 'integer',
          },
        ],
        responses: {
          200: {
            description: 'Send a transaction',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: {"success":false,"error":"Token HTR: Insufficient amount of tokens"}
                  },
                  success: {
                    summary: 'Success',
                    value: {"success":true,"message":"","tx":{"hash":"00001bc7043d0aa910e28aff4b2aad8b4de76c709da4d16a48bf713067245029","nonce":33440807,"timestamp":1579656120,"version":1,"weight":16.827294220302488,"parents":["000036e846dee9f58a724543cf5ee14cf745286e414d8acd9563963643f8dc34","000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29"],"inputs":[{"tx_id":"000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29","index":0,"data":"RzBFAiEAyKKbtzdH7FjvjUopHFIXBf+vBcH+2CKirp0mEnLjjvMCIA9iSuW4B/UJMQld+c4Ch5lIwAcTbzisNUaCs+JpK8yDIQI2CLavb5spKwIEskxaVu0B2Tp52BXas3yjdX1XeMSGyw=="}],"outputs":[{"value":1,"token_data":0,"script":"dqkUtK1DlS8IDGxtJBtRwBlzFWihbIiIrA=="}],"tokens":[]}}
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: {"success":false,"message":"Wallet is not ready.","state":1}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: {"success":false,"message":"Invalid wallet-id parameter."}
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-history': {
      get: {
        summary: 'Return the transaction history',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'query',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return the transaction history',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {"0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11":{"tx_id":"0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11","version":1,"timestamp":1578430704,"is_voided":false,"inputs":[{"value":1,"token_data":0,"script":"dqkU98E1NAiRn3fV4nBm1S3e5pPssF+IrA==","decoded":{"type":"P2PKH","address":"HV78k3MkUmt6no59cV1kCJzo2CfPXGNmRv","timelock":null},"token":"00","tx_id":"00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430","index":1},{"value":2,"token_data":0,"script":"dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==","decoded":{"type":"P2PKH","address":"HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe","timelock":null},"token":"00","tx_id":"0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c","index":1}],"outputs":[{"value":3,"token_data":0,"script":"dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==","decoded":{"type":"P2PKH","address":"H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP","timelock":null},"token":"00","spent_by":"000008d7e62d394be9b07c0fe9c69b289e44dbe1350e2100c169fc030ac936ff"}],"parents":["0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c","00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430"]},"0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c":{"tx_id":"0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c","version":1,"timestamp":1578430668,"is_voided":false,"inputs":[{"value":4398,"token_data":0,"script":"dqkUfZRahPx5JF7l8qFzwVjiV1tmhweIrA==","decoded":{"type":"P2PKH","address":"HHy8a7QvQmj727beKFuiYziGb7mi7CdrG3","timelock":null},"token":"00","tx_id":"00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430","index":0}],"outputs":[{"value":4396,"token_data":0,"script":"dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==","decoded":{"type":"P2PKH","address":"H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP","timelock":null},"token":"00","spent_by":"00000174753194de2affba45874ef36c92e0ae270442f2410207cf2ee3d06950"},{"value":2,"token_data":0,"script":"dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==","decoded":{"type":"P2PKH","address":"HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe","timelock":null},"token":"00","spent_by":"0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11"}],"parents":["00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430","000009fe61f75076b0c1abde1ee1881e4886bad80a09e699cb599b538934ce33"]}},
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: {"success":false,"message":"Wallet is not ready.","state":1}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: {"success":false,"message":"Invalid wallet-id parameter."}
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/stop': {
      post: {
        summary: 'Stop a running wallet and remove from store.',
        parameters: [
          {
            name: 'wallet-id',
            'in': 'body',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Stop a wallet',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {"success":true},
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: {"success":false,"message":"Wallet is not ready.","state":1}
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: {"success":false,"message":"Parameter 'wallet-id' is required."}
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: {"success":false,"message":"Invalid wallet-id parameter."}
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default apiDoc;
