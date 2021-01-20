
const apiDoc = {
  openapi: '3.0.0',
  servers: [
    { url: "http://localhost:8000" }
  ],
  info: {
    title: 'Headless Hathor Wallet API',
    description: 'This wallet is fully controlled through an HTTP API.',
    version: '0.5.6',
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
  security: [
    {
      ApiKeyAuth: [],
    }
  ],
  paths: {
    '/start': {
      post: {
        summary: 'Create and start a wallet and add to store.',
        requestBody: {
          description: 'Data to start the wallet',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['wallet-id', 'seedKey'],
                properties: {
                  'wallet-id': {
                    type: 'string',
                    description: 'Define the key of the corresponding wallet it will be executed the request.'
                  },
                  passphrase: {
                    type: 'string',
                    description: 'Passphrase of the wallet that will be created.'
                  },
                  seedKey: {
                    type: 'string',
                    description: 'Key of the corresponding seed in the config file to create the wallet.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to start the wallet',
                  value: {
                    'wallet-id': '123',
                    passphrase: 'Test',
                    seedKey: 'default'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Start a wallet',
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
            name: 'x-wallet-id',
            'in': 'header',
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
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'token',
            'in': 'query',
            description: 'Token uid. Optional parameter to get the balance from a token different than HTR.',
            required: false,
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
            name: 'x-wallet-id',
            'in': 'header',
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
          {
            name: 'index',
            'in': 'query',
            description: 'Get the address in this specific derivation path index.',
            required: false,
            schema: {
              type: 'integer',
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
    '/wallet/addresses': {
      get: {
        summary: 'Return all generated addresses of the wallet.',
        parameters: [
          {
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        responses: {
          200: {
            description: 'Return the addresses',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {"addresses":["H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt", "HPxB4dKccUWbECh1XMWPEgZVZP2EC34BbB"]}
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
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          description: 'Data to create the transaction',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['address', 'value'],
                properties: {
                  address: {
                    type: 'string',
                    description: 'Address to send the tokens.'
                  },
                  value: {
                    type: 'integer',
                    description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.'
                  },
                  token: {
                    type: 'object',
                    required: ['uid', 'name', 'symbol'],
                    description: 'Token to send the transaction, just in case is not HTR.',
                    properties: {
                      uid: {
                        type: 'string',
                        description: 'UID of the custom token to send the transaction.'
                      },
                      name: {
                        type: 'string',
                        description: 'Name of the custom token to send the transaction.'
                      },
                      symbol: {
                        type: 'string',
                        description: 'Symbol of the custom token to send the transaction.'
                      },
                    }
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to create the transaction',
                  value: {
                    address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                    value: 100,
                    token: {
                      uid: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                      name: 'Test Coin',
                      symbol: 'TSC'
                    }
                  }
                }
              }
            }
          }
        },
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
    '/wallet/send-tx': {
      post: {
        summary: 'Send a transaction with many outputs.',
        parameters: [
          {
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        requestBody: {
          description: 'Data to create the transaction',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['outputs'],
                properties: {
                  outputs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        address: {
                          type: 'string',
                          description: 'Destination address of the output.'
                        },
                        value: {
                          type: 'integer',
                          description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.'
                        },
                      }
                    },
                    description: 'Outputs to create the transaction.'
                  },
                  inputs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        hash: {
                          type: 'string',
                          description: 'Hash of the transaction being spent in this input.'
                        },
                        index: {
                          type: 'integer',
                          description: 'Index of the output being spent in this input.'
                        },
                      }
                    },
                    description: 'Inputs to create the transaction.'
                  },
                  token: {
                    type: 'object',
                    required: ['uid', 'name', 'symbol'],
                    description: 'Token to send the transaction, just in case is not HTR.',
                    properties: {
                      uid: {
                        type: 'string',
                        description: 'UID of the custom token to send the transaction.'
                      },
                      name: {
                        type: 'string',
                        description: 'Name of the custom token to send the transaction.'
                      },
                      symbol: {
                        type: 'string',
                        description: 'Symbol of the custom token to send the transaction.'
                      },
                    }
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to create the transaction',
                  value: {
                    outputs: [
                      {
                        address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                        value: 100
                      }
                    ],
                    inputs: [
                      {
                        hash: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        index: 0,
                      }
                    ],
                    token: {
                      uid: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                      name: 'Test Coin',
                      symbol: 'TSC'
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Send a transaction with many outputs',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: {"success":false,"error":"Token HTR: Insufficient amount of tokens"}
                  },
                  success: {
                    summary: 'Success',
                    value: {"success": true, "message": "", "return_code": "success", "tx": {"hash": "00000000059dfb65633acacc402c881b128cc7f5c04b6cea537ea2136f1b97fb", "nonce": 2455281664, "timestamp": 1594955941, "version": 1, "weight": 18.11897634891149, "parents": ["00000000556bbfee6d37cc099a17747b06f48ca3d9bf4af85c707aa95ad04b3f", "00000000e2e3e304e364edebff1c04c95cc9ef282463295f6e417b85fec361dd"], "inputs": [{"tx_id": "00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65", "index": 1, "data": "RjBEAiAYR8jc+zqY596QyMp+K3Eag3kQB5aXdfYja19Fa17u0wIgCdhBQpjlBiAawP/9WRAqAzW85CJlBpzq+YVhUALg8IUhAueFQuEkAo+s2m7nj/hnh0nyphcUuxa2LoRBjOsEOHRQ"}, {"tx_id": "00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65", "index": 2, "data": "RzBFAiEAofVXnCKNCEu4GRk7j+wHpQM6qmezRcfxHCe/PcUdbegCIE2nip27ZQtkpkEgNEhycqHM4CkLYMLVUgskphYsd/M9IQLHG6YJxXifQ6eMxPHbINFEJAUvrzKWe9V7AXXW4iywjg=="}], "outputs": [{"value": 100, "token_data": 0, "script": "dqkUqdK8VisGSJuNItIBRYFfSHfHjPeIrA=="}, {"value": 200, "token_data": 0, "script": "dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA=="}], "tokens": []}}
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
    '/wallet/create-token': {
      post: {
        summary: 'Create a token.',
        parameters: [
          {
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        requestBody: {
          description: 'Data to create the token.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'symbol', 'amount'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'Name of the token.'
                  },
                  symbol: {
                    type: 'string',
                    description: 'Symbol of the token.'
                  },
                  amount: {
                    type: 'integer',
                    description: 'The amount of tokens to mint. It must be an integer with the value in cents, i.e., 123 means 1.23.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to create the token',
                  value: {
                    name: 'Test Coin',
                    symbol: 'TSC',
                    amount: 100,
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Create the token',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: {"success":false,"error": "Don't have enough HTR funds to mint this amount."}
                  },
                  success: {
                    summary: 'Success',
                    value: {"hash": "00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277","nonce": 200,"timestamp": 1610730485,"version": 2,"weight": 8.000001,"parents": [ "006814ba6ac14d8dc69a888dcf79e3c9ad597b31449edd086a82160698ea229d", "001ac1d7ff68e9bf4bf67b81fee517f08b06be564d7a28b13e41fea158b4cf54" ], "inputs": [ { "tx_id": "00efbc1f99dc50a3c7ff7e7193ebfaa3df28eec467bcd0555eaf703ae773ab5c", "index": 1, "data": "RzBFAiEAxFEPpgauWvPzCoM3zknUdOsWL2RwBu8JSOS6yKGufRICIAOf/mKgLka73wiwXUzVLC/kMYXKmqYSnA2oki6pm9qBIQOyMiKwc3u+O4mBUuN7BFLMwW9hmvUL+KmYPr1N0fl8ww==" } ], "outputs": [ { "value": 6290, "token_data": 0, "script": "dqkUPzRQOMrZ7k25txm/8V0PVr7dGwSIrA==" }, { "value": 1000, "token_data": 1, "script": "dqkUPzRQOMrZ7k25txm/8V0PVr7dGwSIrA==" }, { "value": 1, "token_data": 129, "script": "dqkUL2o1cHLbOQZfj+yVFP0rof9S+WGIrA==" }, { "value": 2, "token_data": 129, "script": "dqkUVawHzE0m6oUvfyzz2cAUdvYlP/SIrA==" } ], "tokens": [], "token_name": "Test", "token_symbol": "TST" }
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
    '/wallet/mint-tokens': {
      post: {
        summary: 'Mint tokens.',
        parameters: [
          {
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        requestBody: {
          description: 'Data to mint tokens.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'amount', 'address'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'UID of the token to mint.'
                  },
                  address: {
                    type: 'string',
                    description: 'Destination address of the minted tokens.'
                  },
                  amount: {
                    type: 'integer',
                    description: 'The amount of tokens to mint. It must be an integer with the value in cents, i.e., 123 means 1.23.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to mint tokens',
                  value: {
                    token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                    address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                    amount: 100,
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Mint tokens.',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: {"success":false,"error": "Don't have enough HTR funds to mint this amount."}
                  },
                  success: {
                    summary: 'Success',
                    value: {"hash":"0072abb9f3f98aa9d9a4e46d6c4f07c16258dbc963f89213f9f4d03dff5977bc","nonce":2,"timestamp":1610730780,"version":1,"weight":8.000001,"parents":["00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277","006814ba6ac14d8dc69a888dcf79e3c9ad597b31449edd086a82160698ea229d"],"inputs":[{"tx_id":"00c6fe8179e6f93d220707a58b94fa876d81eb0d7caaa713e865ba4a5b24a03e","index":0,"data":"RjBEAiBsR2Yv7g9juMwLjgt+XUbuRGRb9BLyHQVQZSPX4pFToQIgES1EO8QHewCiPTg5T228++eZk8CdzkJ3itvxsVuAcV0hA7IyIrBze747iYFS43sEUszBb2Ga9Qv4qZg+vU3R+XzD"},{"tx_id":"00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277","index":2,"data":"RjBEAiAD3Iq6Uy5y+phl9j6Q2wU+zEqWHXt4YgTvBXkQrBZYAQIgKBXSf8pDZwA6Trl+OVtRRoTNFTbQYK6300aZ0IPNuJEhA9jOwwMvZUEgKSQnarS0hLYt2px6eas4E03c4pJpRGfH"}],"outputs":[{"value":90,"token_data":0,"script":"dqkUeAmBO6S3tT7y/HyCXrqOWXkOETWIrA=="},{"value":1000,"token_data":1,"script":"dqkUeAmBO6S3tT7y/HyCXrqOWXkOETWIrA=="},{"value":1,"token_data":129,"script":"dqkUPqMYv+My2kCjdYqx6nHNxLVtRpSIrA=="}],"tokens":["00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277"]}
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
    '/wallet/melt-tokens': {
      post: {
        summary: 'Melt tokens.',
        parameters: [
          {
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'token',
            'in': 'formData',
            description: 'The uid of the token to melt.',
            required: true,
            type: 'string',
          },
          {
            name: 'amount',
            'in': 'formData',
            description: 'The amount of tokens to melt. It must be an integer with the value in cents, i.e., 123 means 1.23.',
            required: true,
            type: 'integer',
          },
        ],
        requestBody: {
          description: 'Data to melt tokens.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'amount'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'UID of the token to melt.'
                  },
                  amount: {
                    type: 'integer',
                    description: 'The amount of tokens to melt. It must be an integer with the value in cents, i.e., 123 means 1.23.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to melt tokens.',
                  value: {
                    token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                    amount: 100,
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Melt tokens.',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: {"success":false,"error": "There aren't enough inputs to melt."}
                  },
                  success: {
                    summary: 'Success',
                    value: {"hash":"00a963872c86978873cce570bbcfc2c40bb8714d5970f80cdc5477c693b01cbf","nonce":256,"timestamp":1610730988,"version":1,"weight":8.000001,"parents":["0072abb9f3f98aa9d9a4e46d6c4f07c16258dbc963f89213f9f4d03dff5977bc","00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277"],"inputs":[{"tx_id":"00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277","index":3,"data":"RjBEAiAQE9pqOo/xlWhv/4gLW6eP5C8s+O/ut4u6Yofg1sbYhQIgQR5KhNrx6SPRij7CbT0dXE3/n3nq9ES13fSZAIBw3+MhAhjIOGT0cwytQmoDCpauM7r3xox0xgzSpfy7MHfYR1Qp"},{"tx_id":"0072abb9f3f98aa9d9a4e46d6c4f07c16258dbc963f89213f9f4d03dff5977bc","index":1,"data":"RjBEAiByaprtd/MjMpwPy3O0xr8LjLdPzVjOV0G54NM/zZ5HsAIgRRFmwxTR1hFg2HOgsYKEA2/BvaUyaPTEEmX7oxCWxMMhA+U12voabjO6b2tdHJvxNs4lYd2vvV7RBmSQiSLqcPhH"},{"tx_id":"00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277","index":1,"data":"RjBEAiBU+XD4Bgm6VHd8H//61aYXDvr7gyZFE2otlbQs+FVpAwIgbZvxSvPUu0EC7aKblP0qsglbsWVzW0KAMIk35acmsKIhA4RC86eRBr2xSH487ramK1DWBOB2ffSeuxVDDnoZPwPp"}],"outputs":[{"value":2,"token_data":129,"script":"dqkUFj/MJhGG+ZGCwDF3BlyeeoP2DymIrA=="},{"value":20,"token_data":0,"script":"dqkUBxW0lxHapoovTTGBVdEo4iNl+gWIrA=="}],"tokens":["00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277"]}
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
            name: 'x-wallet-id',
            'in': 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'limit',
            'in': 'query',
            description: 'Sort and return only the quantity in limit.',
            required: false,
            schema: {
              type: 'integer',
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
            name: 'x-wallet-id',
            'in': 'header',
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
