const { cloneDeep } = require('lodash');
const settings = require('./settings');
const packageJson = require('../package.json');

const commonExamples = {
  xWalletIdErrResponseExamples: {
    'no-wallet-id': {
      summary: 'No wallet id parameter',
      value: { success: false, message: "Parameter 'wallet-id' is required." }
    },
    'invalid-wallet-id': {
      summary: 'Wallet id parameter is invalid',
      value: { success: false, message: 'Invalid wallet-id parameter.' }
    },
  },
};

const nanoContractsDataParameter = {
  type: 'object',
  description: 'Data of the method for the nano contract.',
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'token', 'amount'],
        properties: {
          type: {
            type: 'string',
            description: 'Type of action: \'deposit\' or \'withdrawal\'.'
          },
          token: {
            type: 'string',
            description: 'Token of the action.'
          },
          amount: {
            type: 'integer',
            description: 'Amount to deposit or withdrawal.'
          },
          address: {
            type: 'string',
            description: 'Required for withdrawal, and it\'s the address to send the token to. For deposit is optional and it\'s the address to get the utxo from.'
          },
          changeAddress: {
            type: 'string',
            description: 'Address to send the change amount. Only used for deposit and it\'s optional.'
          },
        }
      },
      description: 'List of actions for the initialize method.'
    },
    args: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'integer',
          },
          {
            type: 'number',
          },
          {
            type: 'boolean',
          },
        ],
      },
      description: 'List of arguments for the method.'
    },
  }
};

// Default values for the API Docs
const defaultApiDocs = {
  openapi: '3.0.0',
  servers: [
    { url: 'http://localhost:8000' }
  ],
  info: {
    title: 'Headless Hathor Wallet API',
    description: 'This wallet is fully controlled through an HTTP API.',
    version: packageJson.version,
    license: {
      name: 'MIT',
      url: 'https://github.com/HathorNetwork/hathor-wallet-headless/blob/master/LICENSE'
    },
  },
  components: {
    parameters: {
      XWalletIdParameter: {
        name: 'x-wallet-id',
        in: 'header',
        description: 'Defines the key of the wallet on which the request will be executed.',
        required: true,
        schema: {
          type: 'string',
        },
      },
    },
  },
  security: [],
  paths: {
    '/start': {
      post: {
        operationId: 'startWallet',
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
                    description: 'Defines the key of wallet that future requests will need to use as a reference.'
                  },
                  passphrase: {
                    type: 'string',
                    description: 'Passphrase of the wallet that will be created.'
                  },
                  seedKey: {
                    type: 'string',
                    description: 'Key of the corresponding seed in the config file to create the wallet.'
                  },
                  seed: {
                    type: 'string',
                    description: '24-words seed separated with spaces. This parameter is incompatible with seedKey. Either seed or seedKey are required.'
                  },
                  xpubkey: {
                    type: 'string',
                    description: 'Account level xpubkey. This will be used to start wallet on readonly mode.',
                  },
                  multisig: {
                    type: 'boolean',
                    description: 'Start as a multisig wallet. Requires multisig configuration.'
                  },
                  multisigKey: {
                    type: 'string',
                    description: 'Key of the multisig wallet data in the config. This allow wallets to be started without a seedKey, e.g. with the seed on the parameters or from an xpubkey.',
                  },
                  scanPolicy: {
                    type: 'string',
                    enum: ['gap-limit', 'index-limit'],
                    description: 'Address scanning policy to use.',
                    default: 'gap-limit',
                  },
                  gapLimit: {
                    type: 'number',
                    description: 'Gap limit to use when scanning addresses. Only used when scanPolicy is set to \'gap-limit\'. If not given the configured default will apply.',
                  },
                  policyStartIndex: {
                    type: 'number',
                    description: 'Load addresses starting from this index. Only used when scanPolicy is set to \'index-limit\'.',
                    default: 0,
                  },
                  policyEndIndex: {
                    type: 'number',
                    description: 'Stop loading addresses at this index. Only used when scanPolicy is set to \'index-limit\'. Defaults to policyStartIndex',
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
                    value: { success: true },
                  },
                  'seed-not-found': {
                    summary: 'Seed key sent does not exist in config file.',
                    value: { success: false, message: 'Seed not found.' }
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: { success: false, message: "Parameter 'wallet-id' is required." }
                  },
                  'wallet-already-started': {
                    summary: 'Wallet with same id was already started.',
                    value: { success: false, message: 'Failed to start wallet with id X', errorCode: 'WALLET_ALREADY_STARTED' }
                  },
                  'start-failed': {
                    summary: 'Wallet failed to start.',
                    value: { success: false, message: 'Failed to start wallet with id X' }
                  },
                },
              },
            },
          },
        },
      },
    },
    '/hsm/start': {
      post: {
        operationId: 'hsmWalletStart',
        summary: 'Create and start a read-only wallet through an HSM, then add it to store.',
        requestBody: {
          description: 'Data to start the wallet',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['wallet-id', 'hsm-key'],
                properties: {
                  'wallet-id': {
                    type: 'string',
                    description: 'Define the key of the corresponding wallet it will be executed the request.'
                  },
                  'hsm-key': {
                    type: 'string',
                    description: 'Key name containing the BIP32 xPriv on the HSM device.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to start the wallet',
                  value: {
                    'wallet-id': 'hardware-wallet-1',
                    'hsm-key': 'hathor_wallet_1',
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
                    value: { success: true },
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: { success: false, message: "Parameter 'wallet-id' is required." }
                  },
                  'no-hsm-key': {
                    summary: 'No HSM key parameter',
                    value: { success: false, message: "Parameter 'hsm-key' is required." }
                  },
                  'hsm-key-invalid': {
                    summary: 'HSM key informed is not valid',
                    value: { success: false, message: `Informed 'hsm-key' is not a valid xPriv.` }
                  },
                  'start-failed': {
                    summary: 'Wallet failed to start.',
                    value: { success: false, message: 'Failed to start wallet with id X and key Y' }
                  },
                  'wallet-already-started': {
                    summary: 'Wallet with same id was already started.',
                    value: { success: false, message: 'Error starting wallet because this wallet-id is already in use. You must stop the wallet first.', errorCode: 'WALLET_ALREADY_STARTED' }
                  },
                },
              },
            },
          },
        },
      },
    },
    '/fireblocks/start': {
      post: {
        operationId: 'fireblocksWalletStart',
        summary: 'Start a fireblocks client wallet on Hathor network.',
        requestBody: {
          description: 'Data to start the wallet',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['wallet-id', 'xpub'],
                properties: {
                  'wallet-id': {
                    type: 'string',
                    description: 'Define the key of the corresponding wallet it will be executed the request.'
                  },
                  xpub: {
                    type: 'string',
                    description: 'Fireblocks xPub derived to the Fireblocks account path (m/44/280/0).'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to start the wallet',
                  value: {
                    'wallet-id': 'hardware-wallet-1',
                    xpub: 'xpub...',
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
                    value: { success: true },
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: { success: false, message: "Parameter 'wallet-id' is required." }
                  },
                  'no-xpub': {
                    summary: 'No xPub parameter',
                    value: { success: false, message: "Parameter 'xpub' is required." }
                  },
                  'start-failed': {
                    summary: 'Wallet failed to start.',
                    value: { success: false, message: 'Failed to start wallet with id X' }
                  },
                  'wallet-already-started': {
                    summary: 'Wallet with same id was already started.',
                    value: { success: false, message: 'Failed to start wallet with id X', errorCode: 'WALLET_ALREADY_STARTED' }
                  },
                  'fireblocks-not-configured': {
                    summary: 'Missing Fireblocks client config.',
                    value: { success: false, message: 'Fireblocks client is not configured.' }
                  },
                  'fireblocks-invalid-xpub': {
                    summary: 'Fireblocks first address and local xPub first address do not match.',
                    value: { success: false, message: 'Fireblocks api generated a public key different from local public key.' }
                  },
                  'fireblocks-api-error': {
                    summary: 'Client raised an error when trying to connect to Fireblocks API.',
                    value: { success: false, message: 'Could not validate Fireblocks client config, received error: X' }
                  },
                },
              },
            },
          },
        },
      },
    },
    '/multisig-pubkey': {
      post: {
        operationId: 'getMultisigPubkey',
        summary: 'Get MultiSig xpub for a seed.',
        requestBody: {
          description: '',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['seedKey'],
                properties: {
                  seedKey: {
                    type: 'string',
                    description: 'Key of the corresponding seed in the config file to create the wallet.'
                  },
                  passphrase: {
                    type: 'string',
                    description: 'Passphrase of the wallet.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Get multisig for default seed',
                  value: {
                    seedKey: 'default',
                    passphrase: 'Test',
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Get MultiSig xpubkey',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, xpubkey: 'xpub....' },
                  },
                  'seed-not-found': {
                    summary: 'Seed key sent does not exist in config file.',
                    value: { success: false, message: 'Seed not found.' }
                  },
                },
              },
            },
          },
        },
      }
    },
    '/wallet/status': {
      get: {
        operationId: 'getWalletStatus',
        summary: 'Return the wallet status',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        responses: {
          200: {
            description: 'A JSON with general wallet info',
            content: {
              'application/json': {
                examples: {
                  closed: {
                    summary: 'Wallet is closed',
                    value: { statusCode: 0, statusMessage: 'Closed', network: 'mainnet', serverUrl: 'https://node2.mainnet.hathor.network/v1a/', serverInfo: null }
                  },
                  connecting: {
                    summary: 'Wallet is connecting',
                    value: { statusCode: 1, statusMessage: 'Connecting', network: 'mainnet', serverUrl: 'https://node2.mainnet.hathor.network/v1a/', serverInfo: null }
                  },
                  syncing: {
                    summary: 'Wallet is syncing',
                    value: { statusCode: 2, statusMessage: 'Syncing', network: 'mainnet', serverUrl: 'https://node2.mainnet.hathor.network/v1a/', serverInfo: { version: '0.29.0', network: 'mainnet', min_weight: 14, min_tx_weight: 14, min_tx_weight_coefficient: 1.6, min_tx_weight_k: 100, token_deposit_percentage: 0.01 } }
                  },
                  ready: {
                    summary: 'Wallet is ready',
                    value: { statusCode: 3, statusMessage: 'Ready', network: 'mainnet', serverUrl: 'https://node2.mainnet.hathor.network/v1a/', serverInfo: { version: '0.29.0', network: 'mainnet', min_weight: 14, min_tx_weight: 14, min_tx_weight_coefficient: 1.6, min_tx_weight_k: 100, token_deposit_percentage: 0.01 } }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/balance': {
      get: {
        operationId: 'getWalletBalance',
        summary: 'Return the balance of HTR',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'token',
            in: 'query',
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
                    value: { available: 2, locked: 0 }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/address': {
      get: {
        operationId: 'getCurrentAddress',
        summary: 'Return the current address',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'mark_as_used',
            in: 'query',
            description: 'Mark the current address as used. So, it will return a new address in the next call.',
            required: false,
            schema: {
              type: 'boolean',
            },
          },
          {
            name: 'index',
            in: 'query',
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
                    value: { address: 'H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/address-index': {
      get: {
        operationId: 'getAddressIndex',
        summary: 'Get the index of an address',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'address',
            in: 'query',
            description: 'Address to get the index.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return the index of the address.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { index: 2, success: true },
                  },
                  error: {
                    summary: 'Address does not belong to the wallet',
                    value: { success: false },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/addresses': {
      get: {
        operationId: 'getAddresses',
        summary: 'Return all generated addresses of the wallet.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        responses: {
          200: {
            description: 'Return the addresses',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { addresses: ['H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt', 'HPxB4dKccUWbECh1XMWPEgZVZP2EC34BbB'] }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/simple-send-tx': {
      post: {
        operationId: 'simpleSendTx',
        summary: 'Send a transaction to exactly one output.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                    type: 'string',
                    description: 'Token uid to send the transaction, just in case is not HTR.',
                  },
                  'token [DEPRECATED]': {
                    type: 'object',
                    required: ['uid', 'name', 'symbol'],
                    description: '[DEPRECATED] Token to send the transaction, just in case is not HTR. This parameter is old and still works for compatibility reasons but will be removed soon, you should use the string format.',
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
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to create the transaction',
                  value: {
                    address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                    value: 100,
                    token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
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
                    value: { success: false, error: 'Token HTR: Insufficient amount of tokens' }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, message: '', tx: { hash: '00001bc7043d0aa910e28aff4b2aad8b4de76c709da4d16a48bf713067245029', nonce: 33440807, timestamp: 1579656120, version: 1, weight: 16.827294220302488, parents: ['000036e846dee9f58a724543cf5ee14cf745286e414d8acd9563963643f8dc34', '000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29'], inputs: [{ tx_id: '000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29', index: 0, data: 'RzBFAiEAyKKbtzdH7FjvjUopHFIXBf+vBcH+2CKirp0mEnLjjvMCIA9iSuW4B/UJMQld+c4Ch5lIwAcTbzisNUaCs+JpK8yDIQI2CLavb5spKwIEskxaVu0B2Tp52BXas3yjdX1XeMSGyw==' }], outputs: [{ value: 1, token_data: 0, script: 'dqkUtK1DlS8IDGxtJBtRwBlzFWihbIiIrA==' }], tokens: [] } }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/decode': {
      post: {
        operationId: 'decodeTx',
        summary: 'Decode tx hex or serialized partial tx into human readable inputs and outputs with metadata to assist informed decision-making. To obtain input metadata, this method retrieves a transaction per input from the wallet\'s transaction history. If the required transaction is not located, the method queries the fullnode for the transaction details.',
        requestBody: {
          description: 'Transaction hex representation or a partial transaction serialization.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  txHex: {
                    type: 'string',
                    description: 'Hex format of a Transaction instance.'
                  },
                  partial_tx: {
                    type: 'string',
                    description: 'Serialized PartialTx instance.',
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Decode a transaction from its hex',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: true,
                      tx: {
                        completeSignatures: false,
                        tokens: [],
                        outputs: [
                          {
                            decoded: {
                              address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                              timelock: null,
                            },
                            token: '00',
                            value: 100,
                            tokenData: 0,
                            token_data: 0,
                            script: 'dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA==',
                            type: 'p2sh',
                            mine: true,
                          }
                        ],
                        inputs: [
                          {
                            decoded: {
                              type: 'MultiSig',
                              address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                              timelock: null,
                            },
                            txId: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                            index: 0,
                            token: '00',
                            value: 100,
                            tokenData: 0,
                            token_data: 0,
                            script: 'dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA==',
                            signed: false,
                            mine: true,
                          }
                        ]
                      },
                      balance: {
                        '00': {
                          tokens: { available: 0, locked: 0 },
                          authorities: {
                            melt: { available: 0, locked: 0 },
                            mint: { available: 0, locked: 0 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-proposal': {
      post: {
        operationId: 'createTxProposal',
        summary: 'Build a transaction with many outputs without sending. Will not include signatures.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                          description: 'Destination address of the output. Required if P2PKH or P2SH.'
                        },
                        value: {
                          type: 'integer',
                          description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR. Required if P2PKH or P2SH.'
                        },
                        token: {
                          type: 'string',
                          description: 'Token id of the output. If not sent, HTR will be chosen.'
                        },
                        type: {
                          type: 'string',
                          description: 'Type of output script. Required if data script and expected to be "data".'
                        },
                        data: {
                          type: 'string',
                          description: 'Data string of the data script output. Required if it\'s a data script output.'
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
                          description: 'Hash of the transaction being spent in this input. Used if not type query.'
                        },
                        index: {
                          type: 'integer',
                          description: 'Index of the output being spent in this input. Used if not type query.'
                        },
                        type: {
                          type: 'string',
                          description: 'Type of input object. Can be \'query\' only for now.'
                        },
                        max_utxos: {
                          type: 'integer',
                          description: 'Maximum number of utxos to filter in the query. Optional query parameter when using type query.'
                        },
                        token: {
                          type: 'string',
                          description: 'Token uid to filter utxos in the query. Optional query parameter when using type query.'
                        },
                        filter_address: {
                          type: 'string',
                          description: 'Address to filter utxos in the query. Optional query parameter when using type query.'
                        },
                        amount_smaller_than: {
                          type: 'integer',
                          description: 'Filter only utxos with value smaller than this. Optional query parameter when using type query.'
                        },
                        amount_bigger_than: {
                          type: 'integer',
                          description: 'Filter only utxos with value bigger than this. Optional query parameter when using type query.'
                        },
                      }
                    },
                    description: 'Inputs to create the transaction.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
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
                        value: 100,
                        token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
                      }
                    ],
                    inputs: [
                      {
                        hash: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        index: 0,
                      }
                    ]
                  }
                },
                dataQuery: {
                  summary: 'Data to create the transaction with query input',
                  value: {
                    outputs: [
                      {
                        address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                        value: 100
                      }
                    ],
                    inputs: [
                      {
                        type: 'query',
                        filter_address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                      }
                    ],
                  }
                },
                dataScript: {
                  summary: 'Transaction with a data script output',
                  value: {
                    outputs: [
                      {
                        address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                        value: 100,
                        token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
                      }, {
                        type: 'data',
                        data: 'test'
                      }
                    ],
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
                    value: { success: false, error: 'Token HTR: Insufficient amount of tokens' }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0123abc...', dataToSignHash: '0123abc...' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-proposal/melt-tokens': {
      post: {
        operationId: 'proposalMeltTokens',
        summary: 'Get the hex representation of a melt tokens transaction without input data.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                  deposit_address: {
                    type: 'string',
                    description: 'Optional deposit_address to send the deposit HTR received after the melt.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount of custom tokens after melt.'
                  },
                  melt_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the new melt authority output created.'
                  },
                  allow_external_melt_authority_address: {
                    type: 'boolean',
                    description: 'If the melt authority address is allowed to be from another wallet. Default is false.'
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Data to melt tokens.',
                  value: {
                    token: '000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa',
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
                    value: { success: false, error: "There aren't enough tokens in the inputs to melt." }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0001010201000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa030069463044022011ebd6bfa5e49d504542e58b55dc79cea70e97069546eae2d4b7f470f7b9d6d302203cb7739de69eded37a5ef15e1d669768057a68d4b6089911ee63d746100a6a1b2102a5c1b462ccdcd8b4bb2cf672e0672576420c3102ecbe74da15b2cf56cf49b4a5000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa010069463044022011ebd6bfa5e49d504542e58b55dc79cea70e97069546eae2d4b7f470f7b9d6d302203cb7739de69eded37a5ef15e1d669768057a68d4b6089911ee63d746100a6a1b2102a5c1b462ccdcd8b4bb2cf672e0672576420c3102ecbe74da15b2cf56cf49b4a500000002810017a91462d397b360118b99a8d35892366074fe16fa6f09874031fc9b86a7279e649b63f60000000000' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-proposal/add-signatures': {
      post: {
        operationId: 'proposalAddSignatures',
        summary: 'Add signatures to the transaction and return the txHex with the signatures.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Transaction hex and signatures',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHex', 'signatures'],
                properties: {
                  txHex: {
                    type: 'string',
                    description: 'Transaction hex representation.'
                  },
                  signatures: {
                    type: 'array',
                    description: 'Signatures collected for the transaction.',
                    items: {
                      type: 'object',
                      required: ['index', 'data'],
                      properties: {
                        index: {
                          type: 'number',
                          description: 'Input index this signature refers to.',
                        },
                        data: {
                          type: 'string',
                          description: 'Hex representation of the input data to be added on the transaction.',
                        },
                      },
                    }
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Get transaction hex with input data.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0123abc...' }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/push-tx': {
      post: {
        operationId: 'pushTxFromHex',
        summary: 'Push a transaction from the txHex.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Signed transaction hex',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHex'],
                properties: {
                  txHex: {
                    type: 'string',
                    description: 'Transaction hex representation.'
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Get tx sent from transaction hex.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, tx: { hash: '00000000059dfb65633acacc402c881b128cc7f5c04b6cea537ea2136f1b97fb', nonce: 2455281664, timestamp: 1594955941, version: 1, weight: 18.11897634891149, parents: ['00000000556bbfee6d37cc099a17747b06f48ca3d9bf4af85c707aa95ad04b3f', '00000000e2e3e304e364edebff1c04c95cc9ef282463295f6e417b85fec361dd'], inputs: [{ tx_id: '00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65', index: 1, data: 'RjBEAiAYR8jc+zqY596QyMp+K3Eag3kQB5aXdfYja19Fa17u0wIgCdhBQpjlBiAawP/9WRAqAzW85CJlBpzq+YVhUALg8IUhAueFQuEkAo+s2m7nj/hnh0nyphcUuxa2LoRBjOsEOHRQ' }, { tx_id: '00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65', index: 2, data: 'RzBFAiEAofVXnCKNCEu4GRk7j+wHpQM6qmezRcfxHCe/PcUdbegCIE2nip27ZQtkpkEgNEhycqHM4CkLYMLVUgskphYsd/M9IQLHG6YJxXifQ6eMxPHbINFEJAUvrzKWe9V7AXXW4iywjg==' }], outputs: [{ value: 100, token_data: 0, script: 'dqkUqdK8VisGSJuNItIBRYFfSHfHjPeIrA==' }, { value: 200, token_data: 0, script: 'dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA==' }], tokens: [] } }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-proposal/get-wallet-inputs': {
      get: {
        operationId: 'proposalGetWalletInputs',
        summary: 'Identify which inputs on the transaction are from the loaded wallet.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'txHex',
            in: 'query',
            description: 'Transaction hex to identify.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return the inputs of the loaded wallet on the txHex.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      inputs: [{
                        inputIndex: 0,
                        addressIndex: 1,
                        addressPath: 'm/44\'/280\'/0\'/0/1',
                      }],
                    },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-proposal/input-data': {
      post: {
        operationId: 'proposalBuildInputData',
        summary: 'Build an input data from the ECDSA signature(s).',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Data required to build the input data',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['index'],
                properties: {
                  index: {
                    type: 'number',
                    description: 'The bip32 path address index we will use.',
                  },
                  signature: {
                    type: 'string',
                    description: '[P2PKH] The ECDSA signature in little endian, DER encoded in hex format.',
                  },
                  signatures: {
                    type: 'object',
                    description: '[P2SH] Each key will be the signer xpubkey as used on the multisig configuration, the value will be the signature (ECDSA little endian, DER encoded in hex format).',
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Get tx sent from transaction hex.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, inputData: 'abc123...' }
                  },
                  'p2sh-wallet-not-multisig': {
                    summary: 'Loaded wallet is not multisig but a multisig input data was requested.',
                    value: { success: false, message: 'wallet is not MultiSig' }
                  },
                  'p2sh-unknown-signer': {
                    summary: 'There is a signature from a signer that does not belong on the loaded wallet multisig.',
                    value: { success: false, message: 'signature from unknown signer' }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/p2sh/tx-proposal': {
      post: {
        operationId: 'createP2shTxProposal',
        summary: 'Get the hex representation of a transaction without input data.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                      required: ['address', 'value'],
                      properties: {
                        address: {
                          type: 'string',
                          description: 'Destination address of the output.'
                        },
                        value: {
                          type: 'integer',
                          description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.'
                        },
                        token: {
                          type: 'string',
                          description: 'Token id of the output. If not sent, HTR will be chosen.'
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
                        txId: {
                          type: 'string',
                          description: 'Id of the transaction being spent in this input.'
                        },
                        index: {
                          type: 'integer',
                          description: 'Index of the output being spent in this input.'
                        },
                      }
                    },
                    description: 'Inputs to create the transaction.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
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
                        value: 100,
                        token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
                      }
                    ],
                    inputs: [
                      {
                        txId: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        index: 0,
                      }
                    ]
                  }
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Create a transaction and get the hex representation of it',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: { success: false, error: 'Token HTR: Insufficient amount of tokens' }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0123abc...' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/p2sh/tx-proposal/create-token': {
      post: {
        operationId: 'createTokenP2shProposal',
        summary: 'Get the hex representation of a create a token transaction without input data.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                  address: {
                    type: 'string',
                    description: 'Optional destination address of the minted tokens.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                  create_mint: {
                    type: 'boolean',
                    description: 'If should create mint authority for the created token. Default is true.'
                  },
                  mint_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the mint authority output created.'
                  },
                  allow_external_mint_authority_address: {
                    type: 'boolean',
                    description: 'If the mint authority address is allowed to be from another wallet. Default is false.'
                  },
                  create_melt: {
                    type: 'boolean',
                    description: 'If should create melt authority for the created token. Default is true.'
                  },
                  melt_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the melt authority output created.'
                  },
                  allow_external_melt_authority_address: {
                    type: 'boolean',
                    description: 'If the melt authority address is allowed to be from another wallet. Default is false.'
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
                    value: { success: false, error: "Don't have enough HTR funds to mint this amount." }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '00020104000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa000069463044022074a1bf9c2d56e887558f459573d75df647acbde7b90de3502b7220425ff69dcb022000e0690e43ad306adef7f59bd07cf817ab8da29bce5cd82ede61ffb99cb460022102a5c1b462ccdcd8b4bb2cf672e0672576420c3102ecbe74da15b2cf56cf49b4a5000001f1000017a91462d397b360118b99a8d35892366074fe16fa6f098700000001010017a91462d397b360118b99a8d35892366074fe16fa6f098700000001810017a91462d397b360118b99a8d35892366074fe16fa6f098700000002810017a91462d397b360118b99a8d35892366074fe16fa6f098701164d7920437573746f6d20546f6b656e204d616e75616c034d43544031dbcd5cef20c5649b59130000000000' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/p2sh/tx-proposal/mint-tokens': {
      post: {
        operationId: 'mintTokensP2shProposal',
        summary: 'Get the hex representation of a mint tokens transaction without input data.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Data to mint tokens.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'amount'],
                properties: {
                  token: {
                    type: 'string',
                    description: 'UID of the token to mint.'
                  },
                  amount: {
                    type: 'integer',
                    description: 'The amount of tokens to mint. It must be an integer with the value in cents, i.e., 123 means 1.23.'
                  },
                  address: {
                    type: 'string',
                    description: 'Optional destination address of the minted tokens.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                  create_mint: {
                    type: 'boolean',
                    description: 'If should create another mint authority for the created token. Default is true.'
                  },
                  mint_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the new mint authority output created.'
                  },
                  allow_external_mint_authority_address: {
                    type: 'boolean',
                    description: 'If the mint authority address is allowed to be from another wallet. Default is false.'
                  },
                }
              },
              examples: {
                'Mint Tokens': {
                  summary: 'Data to mint tokens',
                  value: {
                    token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
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
                    summary: 'Insufficient amount of tokens',
                    value: { success: false, error: "Don't have enough HTR funds to mint this amount." }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0001010203000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa00006946304402201166baf8513c0bfd21edcb169a4df5645ca826b22b6ed22d13945628094a04c502204f382ef9e6b903397b2bcaaed5316b0bb54212037a30e5cda7a5cf4d785b8f332102a5c1b462ccdcd8b4bb2cf672e0672576420c3102ecbe74da15b2cf56cf49b4a5000016392ed330ed99ff0f74e4169a8d257fd1d07d3b38c4f8ecf21a78f10efa02006946304402201166baf8513c0bfd21edcb169a4df5645ca826b22b6ed22d13945628094a04c502204f382ef9e6b903397b2bcaaed5316b0bb54212037a30e5cda7a5cf4d785b8f332102a5c1b462ccdcd8b4bb2cf672e0672576420c3102ecbe74da15b2cf56cf49b4a5000001f1000017a91462d397b360118b99a8d35892366074fe16fa6f098700000001010017a91462d397b360118b99a8d35892366074fe16fa6f098700000001810017a91462d397b360118b99a8d35892366074fe16fa6f098740327a9b3baad50b649b5f1d0000000000' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      }
    },
    '/wallet/p2sh/tx-proposal/get-my-signatures': {
      post: {
        operationId: 'proposalP2shGetMySignatures',
        summary: 'Get the signatures for all inputs from the wallet',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Transaction hex representation',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHex'],
                properties: {
                  txHex: {
                    type: 'string',
                    description: 'Transaction hex representation.'
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Get all signatures from the inputs of the wallet from the transaction hex',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, signatures: '...' },
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/p2sh/tx-proposal/sign': {
      post: {
        operationId: 'signP2shProposal',
        summary: 'Returns a transaction hex with input data calculated from the arguments',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Transaction hex and signatures',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHex'],
                properties: {
                  txHex: {
                    type: 'string',
                    description: 'Transaction hex representation.'
                  },
                  signatures: {
                    type: 'array',
                    description: 'Signatures collected for the transaction.'
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Get transaction hex with input data.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0123abc...' }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/p2sh/tx-proposal/sign-and-push': {
      post: {
        operationId: 'signAndPushP2shProposal',
        summary: 'Send a transaction from the transaction hex and collected signatures',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Transaction hex and signatures',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHex'],
                properties: {
                  txHex: {
                    type: 'string',
                    description: 'Transaction hex representation.'
                  },
                  signatures: {
                    type: 'array',
                    description: 'Signatures collected for the transaction.'
                  },
                }
              },
            }
          }
        },
        responses: {
          200: {
            description: 'Get tx sent from transaction hex and signatures.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, hash: '00000000059dfb65633acacc402c881b128cc7f5c04b6cea537ea2136f1b97fb', nonce: 2455281664, timestamp: 1594955941, version: 1, weight: 18.11897634891149, parents: ['00000000556bbfee6d37cc099a17747b06f48ca3d9bf4af85c707aa95ad04b3f', '00000000e2e3e304e364edebff1c04c95cc9ef282463295f6e417b85fec361dd'], inputs: [{ tx_id: '00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65', index: 1, data: 'RjBEAiAYR8jc+zqY596QyMp+K3Eag3kQB5aXdfYja19Fa17u0wIgCdhBQpjlBiAawP/9WRAqAzW85CJlBpzq+YVhUALg8IUhAueFQuEkAo+s2m7nj/hnh0nyphcUuxa2LoRBjOsEOHRQ' }, { tx_id: '00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65', index: 2, data: 'RzBFAiEAofVXnCKNCEu4GRk7j+wHpQM6qmezRcfxHCe/PcUdbegCIE2nip27ZQtkpkEgNEhycqHM4CkLYMLVUgskphYsd/M9IQLHG6YJxXifQ6eMxPHbINFEJAUvrzKWe9V7AXXW4iywjg==' }], outputs: [{ value: 100, token_data: 0, script: 'dqkUqdK8VisGSJuNItIBRYFfSHfHjPeIrA==' }, { value: 200, token_data: 0, script: 'dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA==' }], tokens: [] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal': {
      post: {
        operationId: 'createAtomicSwapProposal',
        summary: 'Create or update an atomic-swap proposal.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Data to create the proposal',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  partial_tx: {
                    description: 'A proposal to update. If not present a new one will be created.',
                    type: 'string',
                  },
                  receive: {
                    description: 'Create outputs receiving the tokens as described in this parameter.',
                    type: 'object',
                    required: ['tokens'],
                    properties: {
                      tokens: {
                        description: 'Description of tokens to be received.',
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['value'],
                          properties: {
                            value: {
                              type: 'integer',
                              description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.'
                            },
                            token: {
                              type: 'string',
                              description: 'Token id to be received. If not present, it will be interpreted as HTR.'
                            },
                            address: {
                              type: 'string',
                              description: 'Receive tokens in this address, if not present, an address from the wallet will be chosen.'
                            },
                          }
                        },
                      },
                    },
                  },
                  send: {
                    description: 'Create inputs to send tokens from this wallet as described here. May add change outputs if needed.',
                    type: 'object',
                    required: ['tokens'],
                    properties: {
                      tokens: {
                        description: 'Description of tokens to be sent.',
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['value'],
                          properties: {
                            value: {
                              type: 'integer',
                              description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR.'
                            },
                            token: {
                              type: 'string',
                              description: 'Token id to be received. If not present, it will be interpreted as HTR.'
                            },
                          }
                        },
                      },
                      utxos: {
                        description: 'If present the wallet will try to use only these utxos and will not get more from the wallet history.',
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['txId', 'index'],
                          properties: {
                            index: {
                              type: 'integer',
                              description: 'Output index of this utxo.',
                            },
                            txId: {
                              type: 'string',
                              description: 'Transaction id of this utxo',
                            },
                          }
                        }
                      }
                    },
                  },
                  lock: {
                    description: 'If the utxos chosen for this proposal should be locked so they are not spent on another call. Use with caution.',
                    type: 'boolean',
                    default: true,
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                  service: {
                    description: 'Property containing references for this proposal on the Atomic Swap Service',
                    type: 'object',
                    required: ['password'],
                    properties: {
                      is_new: {
                        description: 'Determines if this is a new proposal, so that a new proposalId is added to the response',
                        type: 'boolean',
                      },
                      proposal_id: {
                        description: 'Determines the identifier of the existing proposal that is being referenced in this request',
                        type: 'string',
                      },
                      password: {
                        description: 'Mandatory password for interacting with a service-mediated proposal.',
                        type: 'string',
                      },
                      version: {
                        description: 'Version of the proposal to be updated on the service mediator',
                        type: 'integer',
                      },
                    },
                  },
                }
              },
              examples: {
                just_send: {
                  summary: 'Create a proposal sending tokens',
                  value: {
                    send: {
                      tokens: [
                        {
                          value: 10,
                          token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        },
                        {
                          value: 100,
                          token: '00',
                        },
                      ],
                    },
                  }
                },
                just_receive: {
                  summary: 'Create a proposal receiving tokens',
                  value: {
                    receive: {
                      tokens: [
                        {
                          value: 10,
                          token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        },
                        {
                          value: 10,
                        },
                      ],
                    }
                  },
                },
                update_proposal: {
                  summary: 'Update an existing proposal',
                  value: {
                    partial_tx: 'PartialTx|...',
                    send: {
                      tokens: [
                        {
                          value: 10,
                          token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        },
                      ],
                    },
                    receive: {
                      tokens: [
                        {
                          value: 10,
                          token: '00',
                        },
                      ],
                    }
                  },
                },
                just_send_with_service: {
                  summary: 'Create a proposal sending tokens using the Atomic Swap Service',
                  value: {
                    send: {
                      tokens: [
                        {
                          value: 10,
                          token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        },
                        {
                          value: 100,
                          token: '00',
                        },
                      ],
                    },
                    service: {
                      is_new: true,
                      password: 'abc123'
                    }
                  }
                },
                update_proposal_with_service: {
                  summary: 'Update a registered proposal using the Atomic Swap Service',
                  value: {
                    partial_tx: 'PartialTx|...',
                    send: {
                      tokens: [
                        {
                          value: 10,
                          token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        },
                      ],
                    },
                    receive: {
                      tokens: [
                        {
                          value: 10,
                          token: '00',
                        },
                      ],
                    },
                    service: {
                      proposal_id: 'b11948c7-48...',
                      password: 'abc123',
                      version: 1,
                    }
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Create a proposal.',
            content: {
              'application/json': {
                examples: {
                  error: {
                    summary: 'Insuficient amount of tokens',
                    value: { success: false, error: 'Token HTR: Insufficient amount of tokens' }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, data: 'PartialTx|...', isComplete: false }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'service-invalid-password': {
                    summary: 'Atomic Swap Service password is invalid',
                    value: { success: false, error: 'Password must have at least 3 characters' }
                  },
                  'service-new-proposal': {
                    summary: 'Success creating a service-mediated proposal.',
                    value: {
                      success: true,
                      data: 'PartialTx|...',
                      isComplete: false,
                      createdProposalId: 'b11948c7-48...',
                    }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/get-my-signatures': {
      post: {
        operationId: 'getMySwapSignatures',
        summary: 'Get this wallet signatures for a proposal.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Get the requested wallet\'s signatures for an atomic-swap.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['partial_tx'],
                properties: {
                  partial_tx: {
                    description: 'Proposal to sign.',
                    type: 'string',
                  },
                }
              },
              examples: {
                sign: {
                  summary: 'Sign the proposal.',
                  value: {
                    partial_tx: 'PartialTx|...',
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Get signatures for a proposal.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, signatures: 'PartialTxInputData|...' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/register/{proposalId}': {
      post: {
        operationId: 'registerSwapServiceProposal',
        summary: 'Registers a proposal for the Headless Wallet to listen to and interact with the Atomic Swap Service',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'proposalId',
            in: 'path',
            description: 'Proposal identifier on the Atomic Swap Service',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        requestBody: {
          description: 'Request the registration of a proposal id with the service.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: {
                    description: 'Proposal password on the Atomic Swap Service.',
                    type: 'string',
                  },
                }
              },
              examples: {
                fetch: {
                  summary: 'Registration request to interact with proposal',
                  value: {
                    password: 'abc123',
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Successful proposal registration.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: {
                        summary: 'Successful registration',
                        value: {
                          success: true,
                        },
                      },
                    }
                  },
                  'service-failure': {
                    summary: 'Failure validating the proposal data with the service side',
                    value: {
                      success: {
                        summary: 'Unsuccessful validation with the Atomic Swap Service',
                        value: {
                          success: false,
                          error: 'Failure description on the swap service',
                        },
                      },
                    }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/fetch/{proposalId}': {
      get: {
        operationId: 'fetchSwapServiceProposal',
        summary: 'Fetches a proposal data from the Atomic Swap Service',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'proposalId',
            in: 'path',
            description: 'Registered proposal identifier',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        responses: {
          200: {
            description: 'Successful data fetching from the service.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: {
                        summary: 'Successful fetch',
                        value: {
                          success: true,
                          proposal: {
                            proposalId: '1a574e6c-73...',
                            version: 1,
                            timestamp: 'Fri Mar 10 2023 23:13:...',
                            partialTx: 'PartialTx|000100010...',
                            signatures: null,
                            history: []
                          },
                        },
                      },
                    }
                  },
                  'service-failure': {
                    summary: 'Failure on the service side',
                    value: {
                      success: {
                        summary: 'Unsuccessful fetch from the Atomic Swap Service',
                        value: {
                          success: false,
                          error: 'Failure description on the swap service',
                        },
                      },
                    }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/list': {
      get: {
        operationId: 'listSwapServiceProposals',
        summary: 'Fetches the list of listened proposals for this wallet',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        responses: {
          200: {
            description: 'Successful listing of registered proposals.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: {
                        summary: 'Successful listing',
                        value: {
                          success: true,
                          proposals: [
                            '1a574e6c-73...',
                            '85585de5-67...',
                          ],
                        },
                      },
                    }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/delete/{proposalId}': {
      delete: {
        operationId: 'deleteSwapServiceProposal',
        summary: 'Removes a proposal from the registered listened proposals',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'proposalId',
            in: 'path',
            description: 'Registered proposal identifier',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        responses: {
          200: {
            description: 'Successful registration removal.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: {
                        summary: 'Successful removal',
                        value: {
                          success: true,
                        },
                      },
                    }
                  },
                  'service-failure': {
                    summary: 'Failure on the removal',
                    value: {
                      success: {
                        summary: 'Unsuccessful removal operation',
                        value: {
                          success: false,
                          error: 'Failure description',
                        },
                      },
                    }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/sign': {
      post: {
        operationId: 'signSwapProposal',
        summary: 'Add signatures to a proposal and return the signed transaction in hex format.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Add signatures and return the txHex of the resulting transaction.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['partial_tx', 'signatures'],
                properties: {
                  partial_tx: {
                    description: 'Proposal to add signatures.',
                    type: 'string',
                  },
                  signatures: {
                    description: 'Signatures to add.',
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'Signatures of the proposal.',
                    },
                  },
                  service: {
                    description: 'Property containing references for this proposal on the Atomic Swap Service',
                    type: 'object',
                    required: ['proposal_id', 'version'],
                    properties: {
                      proposal_id: {
                        description: 'Determines the identifier of the registered proposal that is being referenced in this request',
                        type: 'string',
                      },
                      version: {
                        description: 'Version of the proposal to be updated on the service mediator',
                        type: 'integer',
                      },
                    },
                  },
                }
              },
              examples: {
                sign: {
                  summary: 'Add signatures to the proposal.',
                  value: {
                    partial_tx: 'PartialTx|...',
                    signatures: ['PartialTxInputData|...', 'PartialTxInputData|...'],
                  },
                },
                sign_with_service: {
                  summary: 'Add signatures to the proposal with the Atomic Swap Service.',
                  value: {
                    partial_tx: 'PartialTx|...',
                    signatures: ['PartialTxInputData|...', 'PartialTxInputData|...'],
                    service: {
                      proposal_id: 'b11948c7-48...',
                      version: 3,
                    }
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Add signatures to a proposal.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, txHex: '0123...' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/sign-and-push': {
      post: {
        operationId: 'signAndPushSwapProposal',
        summary: 'Add signatures to a proposal and push the signed transaction.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Add signatures and push the resulting transaction.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['partial_tx', 'signatures'],
                properties: {
                  partial_tx: {
                    description: 'Proposal to add signatures.',
                    type: 'string',
                  },
                  signatures: {
                    description: 'Signatures to add.',
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'Signatures of the proposal.',
                    },
                  },
                }
              },
              examples: {
                sign: {
                  summary: 'Add signatures to the proposal.',
                  value: {
                    partial_tx: 'PartialTx|...',
                    signatures: ['PartialTxInputData|...', 'PartialTxInputData|...'],
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Add signatures to a proposal.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, tx: { hash: '00001bc7043d0aa910e28aff4b2aad8b4de76c709da4d16a48bf713067245029', nonce: 33440807, timestamp: 1579656120, version: 1, weight: 16.827294220302488, parents: ['000036e846dee9f58a724543cf5ee14cf745286e414d8acd9563963643f8dc34', '000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29'], inputs: [{ tx_id: '000000fe2da5f4cc462e8ccaac8703a38cd6e4266e227198f003dd5c68092d29', index: 0, data: 'RzBFAiEAyKKbtzdH7FjvjUopHFIXBf+vBcH+2CKirp0mEnLjjvMCIA9iSuW4B/UJMQld+c4Ch5lIwAcTbzisNUaCs+JpK8yDIQI2CLavb5spKwIEskxaVu0B2Tp52BXas3yjdX1XeMSGyw==' }], outputs: [{ value: 1, token_data: 0, script: 'dqkUtK1DlS8IDGxtJBtRwBlzFWihbIiIrA==' }], tokens: [] } }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/unlock': {
      post: {
        operationId: 'unlockSwapProposalInputs',
        summary: 'Unlock all inputs if they are marked as selected on the wallet storage.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Unlock the inputs on the proposal.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['partial_tx'],
                properties: {
                  partial_tx: {
                    description: 'Proposal to unlock.',
                    type: 'string',
                  },
                }
              },
              examples: {
                sign: {
                  summary: 'Unlock inputs on proposal.',
                  value: {
                    partial_tx: 'PartialTx|...',
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Extract input data from a signed txHex.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/get-locked-utxos': {
      get: {
        operationId: 'getSwapLockedUtxos',
        summary: 'Get all utxos marked selected as input on a transaction to be sent.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        responses: {
          200: {
            description: 'Return the locked utxos',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: true,
                      locked_utxos: [
                        {
                          tx_id: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                          outputs: [0, 1],
                        },
                      ]
                    }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/atomic-swap/tx-proposal/get-input-data': {
      post: {
        operationId: 'getSwapInputData',
        summary: 'Extract input data from a txHex in an atomic-swap compliant format.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Extract the input data on the given txHex as an atomic-swap signature.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['txHex'],
                properties: {
                  txHex: {
                    description: 'Transaction hex to extract input data.',
                    type: 'string',
                  },
                }
              },
              examples: {
                sign: {
                  summary: 'Extract signatures from txHex.',
                  value: {
                    txHex: '0123...',
                  },
                },
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Extract input data from a signed txHex.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, signatures: 'PartialTxInputData|...' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/send-tx': {
      post: {
        operationId: 'sendTx',
        summary: 'Send a transaction with many outputs.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                          description: 'Destination address of the output. Required if P2PKH or P2SH.'
                        },
                        value: {
                          type: 'integer',
                          description: 'The value parameter must be an integer with the value in cents, i.e., 123 means 1.23 HTR. Required if P2PKH or P2SH.'
                        },
                        token: {
                          type: 'string',
                          description: 'Token id of the output. If not sent, HTR will be chosen.'
                        },
                        type: {
                          type: 'string',
                          description: 'Type of output script. Required if data script and expected to be "data".'
                        },
                        data: {
                          type: 'string',
                          description: 'Data string of the data script output. Required if it\'s a data script output.'
                        },
                        timelock: {
                          type: 'integer',
                          description: 'Timelock value for the output. Used only for P2PKH or P2SH.'
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
                          description: 'Hash of the transaction being spent in this input. Used if not type query.'
                        },
                        index: {
                          type: 'integer',
                          description: 'Index of the output being spent in this input. Used if not type query.'
                        },
                        type: {
                          type: 'string',
                          description: 'Type of input object. Can be \'query\' only for now.'
                        },
                        max_utxos: {
                          type: 'integer',
                          description: 'Maximum number of utxos to filter in the query. Optional query parameter when using type query.'
                        },
                        token: {
                          type: 'string',
                          description: 'Token uid to filter utxos in the query. Optional query parameter when using type query.'
                        },
                        filter_address: {
                          type: 'string',
                          description: 'Address to filter utxos in the query. Optional query parameter when using type query.'
                        },
                        amount_smaller_than: {
                          type: 'integer',
                          description: 'Filter only utxos with value smaller than this. Optional query parameter when using type query.'
                        },
                        amount_bigger_than: {
                          type: 'integer',
                          description: 'Filter only utxos with value bigger than this. Optional query parameter when using type query.'
                        },
                      }
                    },
                    description: 'Inputs to create the transaction.'
                  },
                  token: {
                    type: 'object',
                    required: ['uid', 'name', 'symbol'],
                    description: '[DEPRECATED] Token to send the transaction, just in case is not HTR. This parameter is old and will be deprecated soon, you must preferably use the token parameter in the output object.',
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
                    },
                    deprecated: true,
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
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
                        value: 100,
                        token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
                      }
                    ],
                    inputs: [
                      {
                        hash: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                        index: 0,
                      }
                    ]
                  }
                },
                dataQuery: {
                  summary: 'Data to create the transaction with query input',
                  value: {
                    outputs: [
                      {
                        address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                        value: 100
                      }
                    ],
                    inputs: [
                      {
                        type: 'query',
                        filter_address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                        token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
                      }
                    ],
                    token: {
                      uid: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d',
                      name: 'Test Coin',
                      symbol: 'TSC'
                    }
                  }
                },
                dataScript: {
                  summary: 'Transaction with a data script output',
                  value: {
                    outputs: [
                      {
                        address: 'Wk2j7odPbC4Y98xKYBCFyNogxaRimU6BUj',
                        value: 100,
                        token: '006e18f3c303892076a12e68b5c9c30afe9a96a528f0f3385898001858f9c35d'
                      }, {
                        type: 'data',
                        data: 'test'
                      }
                    ],
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
                    value: { success: false, error: 'Token HTR: Insufficient amount of tokens' }
                  },
                  success: {
                    summary: 'Success',
                    value: { success: true, message: '', return_code: 'success', tx: { hash: '00000000059dfb65633acacc402c881b128cc7f5c04b6cea537ea2136f1b97fb', nonce: 2455281664, timestamp: 1594955941, version: 1, weight: 18.11897634891149, parents: ['00000000556bbfee6d37cc099a17747b06f48ca3d9bf4af85c707aa95ad04b3f', '00000000e2e3e304e364edebff1c04c95cc9ef282463295f6e417b85fec361dd'], inputs: [{ tx_id: '00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65', index: 1, data: 'RjBEAiAYR8jc+zqY596QyMp+K3Eag3kQB5aXdfYja19Fa17u0wIgCdhBQpjlBiAawP/9WRAqAzW85CJlBpzq+YVhUALg8IUhAueFQuEkAo+s2m7nj/hnh0nyphcUuxa2LoRBjOsEOHRQ' }, { tx_id: '00000000caaa37ab729805b91af2de8174e3ef24410f4effc4ffda3b610eae65', index: 2, data: 'RzBFAiEAofVXnCKNCEu4GRk7j+wHpQM6qmezRcfxHCe/PcUdbegCIE2nip27ZQtkpkEgNEhycqHM4CkLYMLVUgskphYsd/M9IQLHG6YJxXifQ6eMxPHbINFEJAUvrzKWe9V7AXXW4iywjg==' }], outputs: [{ value: 100, token_data: 0, script: 'dqkUqdK8VisGSJuNItIBRYFfSHfHjPeIrA==' }, { value: 200, token_data: 0, script: 'dqkUISAnpOn9Vo269QBvOfBeWJTLx82IrA==' }], tokens: [] } }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/create-token': {
      post: {
        operationId: 'createToken',
        summary: 'Create a token.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                  address: {
                    type: 'string',
                    description: 'Destination address of the minted tokens.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                  create_mint: {
                    type: 'boolean',
                    description: 'If should create mint authority for the created token. Default is true.'
                  },
                  mint_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the mint authority output created.'
                  },
                  allow_external_mint_authority_address: {
                    type: 'boolean',
                    description: 'If the mint authority address is allowed to be from another wallet. Default is false.'
                  },
                  create_melt: {
                    type: 'boolean',
                    description: 'If should create melt authority for the created token. Default is true.'
                  },
                  melt_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the melt authority output created.'
                  },
                  allow_external_melt_authority_address: {
                    type: 'boolean',
                    description: 'If the melt authority address is allowed to be from another wallet. Default is false.'
                  },
                  data: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'List of utf-8 encoded strings to create a data output for each.'
                  }
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
                    value: { success: false, error: "Don't have enough HTR funds to mint this amount." }
                  },
                  success: {
                    summary: 'Success',
                    value: { hash: '00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277', nonce: 200, timestamp: 1610730485, version: 2, weight: 8.000001, parents: ['006814ba6ac14d8dc69a888dcf79e3c9ad597b31449edd086a82160698ea229d', '001ac1d7ff68e9bf4bf67b81fee517f08b06be564d7a28b13e41fea158b4cf54'], inputs: [{ tx_id: '00efbc1f99dc50a3c7ff7e7193ebfaa3df28eec467bcd0555eaf703ae773ab5c', index: 1, data: 'RzBFAiEAxFEPpgauWvPzCoM3zknUdOsWL2RwBu8JSOS6yKGufRICIAOf/mKgLka73wiwXUzVLC/kMYXKmqYSnA2oki6pm9qBIQOyMiKwc3u+O4mBUuN7BFLMwW9hmvUL+KmYPr1N0fl8ww==' }], outputs: [{ value: 6290, token_data: 0, script: 'dqkUPzRQOMrZ7k25txm/8V0PVr7dGwSIrA==' }, { value: 1000, token_data: 1, script: 'dqkUPzRQOMrZ7k25txm/8V0PVr7dGwSIrA==' }, { value: 1, token_data: 129, script: 'dqkUL2o1cHLbOQZfj+yVFP0rof9S+WGIrA==' }, { value: 2, token_data: 129, script: 'dqkUVawHzE0m6oUvfyzz2cAUdvYlP/SIrA==' }], tokens: [], token_name: 'Test', token_symbol: 'TST', configurationString: '[Test:TST:00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277:a233sac]' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/mint-tokens': {
      post: {
        operationId: 'mintTokens',
        summary: 'Mint tokens.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                  mint_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the new mint authority output created.'
                  },
                  allow_external_mint_authority_address: {
                    type: 'boolean',
                    description: 'If the mint authority address is allowed to be from another wallet. Default is false.'
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
                    value: { success: false, error: "Don't have enough HTR funds to mint this amount." }
                  },
                  success: {
                    summary: 'Success',
                    value: { hash: '0072abb9f3f98aa9d9a4e46d6c4f07c16258dbc963f89213f9f4d03dff5977bc', nonce: 2, timestamp: 1610730780, version: 1, weight: 8.000001, parents: ['00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277', '006814ba6ac14d8dc69a888dcf79e3c9ad597b31449edd086a82160698ea229d'], inputs: [{ tx_id: '00c6fe8179e6f93d220707a58b94fa876d81eb0d7caaa713e865ba4a5b24a03e', index: 0, data: 'RjBEAiBsR2Yv7g9juMwLjgt+XUbuRGRb9BLyHQVQZSPX4pFToQIgES1EO8QHewCiPTg5T228++eZk8CdzkJ3itvxsVuAcV0hA7IyIrBze747iYFS43sEUszBb2Ga9Qv4qZg+vU3R+XzD' }, { tx_id: '00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277', index: 2, data: 'RjBEAiAD3Iq6Uy5y+phl9j6Q2wU+zEqWHXt4YgTvBXkQrBZYAQIgKBXSf8pDZwA6Trl+OVtRRoTNFTbQYK6300aZ0IPNuJEhA9jOwwMvZUEgKSQnarS0hLYt2px6eas4E03c4pJpRGfH' }], outputs: [{ value: 90, token_data: 0, script: 'dqkUeAmBO6S3tT7y/HyCXrqOWXkOETWIrA==' }, { value: 1000, token_data: 1, script: 'dqkUeAmBO6S3tT7y/HyCXrqOWXkOETWIrA==' }, { value: 1, token_data: 129, script: 'dqkUPqMYv+My2kCjdYqx6nHNxLVtRpSIrA==' }], tokens: ['00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277'] }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/melt-tokens': {
      post: {
        operationId: 'meltTokens',
        summary: 'Melt tokens.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
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
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount of custom tokens after melt.'
                  },
                  deposit_address: {
                    type: 'string',
                    description: 'Optional address to send the deposit HTR received after the melt.'
                  },
                  melt_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the new melt authority output created.'
                  },
                  allow_external_melt_authority_address: {
                    type: 'boolean',
                    description: 'If the melt authority address is allowed to be from another wallet. Default is false.'
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
                    value: { success: false, error: "There aren't enough inputs to melt." }
                  },
                  success: {
                    summary: 'Success',
                    value: { hash: '00a963872c86978873cce570bbcfc2c40bb8714d5970f80cdc5477c693b01cbf', nonce: 256, timestamp: 1610730988, version: 1, weight: 8.000001, parents: ['0072abb9f3f98aa9d9a4e46d6c4f07c16258dbc963f89213f9f4d03dff5977bc', '00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277'], inputs: [{ tx_id: '00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277', index: 3, data: 'RjBEAiAQE9pqOo/xlWhv/4gLW6eP5C8s+O/ut4u6Yofg1sbYhQIgQR5KhNrx6SPRij7CbT0dXE3/n3nq9ES13fSZAIBw3+MhAhjIOGT0cwytQmoDCpauM7r3xox0xgzSpfy7MHfYR1Qp' }, { tx_id: '0072abb9f3f98aa9d9a4e46d6c4f07c16258dbc963f89213f9f4d03dff5977bc', index: 1, data: 'RjBEAiByaprtd/MjMpwPy3O0xr8LjLdPzVjOV0G54NM/zZ5HsAIgRRFmwxTR1hFg2HOgsYKEA2/BvaUyaPTEEmX7oxCWxMMhA+U12voabjO6b2tdHJvxNs4lYd2vvV7RBmSQiSLqcPhH' }, { tx_id: '00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277', index: 1, data: 'RjBEAiBU+XD4Bgm6VHd8H//61aYXDvr7gyZFE2otlbQs+FVpAwIgbZvxSvPUu0EC7aKblP0qsglbsWVzW0KAMIk35acmsKIhA4RC86eRBr2xSH487ramK1DWBOB2ffSeuxVDDnoZPwPp' }], outputs: [{ value: 2, token_data: 129, script: 'dqkUFj/MJhGG+ZGCwDF3BlyeeoP2DymIrA==' }, { value: 20, token_data: 0, script: 'dqkUBxW0lxHapoovTTGBVdEo4iNl+gWIrA==' }], tokens: ['00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277'] }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/create-nft': {
      post: {
        operationId: 'createNFT',
        summary: 'Create an NFT.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Data to create the token.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'symbol', 'amount', 'data'],
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
                    description: 'The amount of tokens to mint. It must be an integer.'
                  },
                  data: {
                    type: 'string',
                    description: 'NFT data for the first output of the transaction.'
                  },
                  address: {
                    type: 'string',
                    description: 'Destination address of the minted tokens.'
                  },
                  change_address: {
                    type: 'string',
                    description: 'Optional address to send the change amount.'
                  },
                  create_mint: {
                    type: 'boolean',
                    description: 'If should create mint authority for the created NFT. Default is false.'
                  },
                  mint_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the mint authority output created.'
                  },
                  allow_external_mint_authority_address: {
                    type: 'boolean',
                    description: 'If the mint authority address is allowed to be from another wallet. Default is false.'
                  },
                  create_melt: {
                    type: 'boolean',
                    description: 'If should create melt authority for the created NFT. Default is false.'
                  },
                  melt_authority_address: {
                    type: 'string',
                    description: 'Optional address to send the melt authority output created.'
                  },
                  allow_external_melt_authority_address: {
                    type: 'boolean',
                    description: 'If the melt authority address is allowed to be from another wallet. Default is false.'
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
                    data: 'ipfs://ipfs/myNFTHash/filename',
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
                    value: { success: false, error: "Don't have enough HTR funds to mint this amount." }
                  },
                  success: {
                    summary: 'Success',
                    value: { hash: '00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277', nonce: 200, timestamp: 1610730485, version: 2, weight: 8.000001, parents: ['006814ba6ac14d8dc69a888dcf79e3c9ad597b31449edd086a82160698ea229d', '001ac1d7ff68e9bf4bf67b81fee517f08b06be564d7a28b13e41fea158b4cf54'], inputs: [{ tx_id: '00efbc1f99dc50a3c7ff7e7193ebfaa3df28eec467bcd0555eaf703ae773ab5c', index: 1, data: 'RzBFAiEAxFEPpgauWvPzCoM3zknUdOsWL2RwBu8JSOS6yKGufRICIAOf/mKgLka73wiwXUzVLC/kMYXKmqYSnA2oki6pm9qBIQOyMiKwc3u+O4mBUuN7BFLMwW9hmvUL+KmYPr1N0fl8ww==' }], outputs: [{ value: 6290, token_data: 0, script: 'dqkUPzRQOMrZ7k25txm/8V0PVr7dGwSIrA==' }, { value: 1000, token_data: 1, script: 'dqkUPzRQOMrZ7k25txm/8V0PVr7dGwSIrA==' }, { value: 1, token_data: 129, script: 'dqkUL2o1cHLbOQZfj+yVFP0rof9S+WGIrA==' }, { value: 2, token_data: 129, script: 'dqkUVawHzE0m6oUvfyzz2cAUdvYlP/SIrA==' }], tokens: [], token_name: 'Test', token_symbol: 'TST', configurationString: '[Test:TST:00c9b977ddb2d0256db38e6c846eac84e0cf7ab8eded2f37119d84ee6edd4277:a233sac]' }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/transaction': {
      get: {
        operationId: 'getTransaction',
        summary: 'Return the data of a transaction, if it exists in the wallet',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'id',
            in: 'query',
            description: 'Transaction id (hash) to get data.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return the transaction data',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { tx_id: '0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11', version: 1, timestamp: 1578430704, is_voided: false, inputs: [{ value: 1, token_data: 0, script: 'dqkU98E1NAiRn3fV4nBm1S3e5pPssF+IrA==', decoded: { type: 'P2PKH', address: 'HV78k3MkUmt6no59cV1kCJzo2CfPXGNmRv', timelock: null }, token: '00', tx_id: '00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430', index: 1 }, { value: 2, token_data: 0, script: 'dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==', decoded: { type: 'P2PKH', address: 'HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe', timelock: null }, token: '00', tx_id: '0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c', index: 1 }], outputs: [{ value: 3, token_data: 0, script: 'dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==', decoded: { type: 'P2PKH', address: 'H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP', timelock: null }, token: '00', spent_by: '000008d7e62d394be9b07c0fe9c69b289e44dbe1350e2100c169fc030ac936ff' }], parents: ['0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c', '00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430'] }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-confirmation-blocks': {
      get: {
        operationId: 'getTxConfirmationBlocks',
        summary: 'Return the number of blocks confirming the transaction, if it exists in the wallet',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'id',
            in: 'query',
            description: 'Transaction id (hash) to get blocks confirmation number.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return the transaction data',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, confirmationNumber: 15 }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'tx-does-not-belong-to-wallet': {
                    summary: 'Wallet does not have transaction requested.',
                    value: { success: false, error: 'Wallet does not contain transaction with id <TX_ID>' }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/tx-history': {
      get: {
        operationId: 'getTxHistory',
        summary: 'Return the transaction history',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'limit',
            in: 'query',
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
                    value: { '0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11': { tx_id: '0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11', version: 1, timestamp: 1578430704, is_voided: false, inputs: [{ value: 1, token_data: 0, script: 'dqkU98E1NAiRn3fV4nBm1S3e5pPssF+IrA==', decoded: { type: 'P2PKH', address: 'HV78k3MkUmt6no59cV1kCJzo2CfPXGNmRv', timelock: null }, token: '00', tx_id: '00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430', index: 1 }, { value: 2, token_data: 0, script: 'dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==', decoded: { type: 'P2PKH', address: 'HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe', timelock: null }, token: '00', tx_id: '0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c', index: 1 }], outputs: [{ value: 3, token_data: 0, script: 'dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==', decoded: { type: 'P2PKH', address: 'H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP', timelock: null }, token: '00', spent_by: '000008d7e62d394be9b07c0fe9c69b289e44dbe1350e2100c169fc030ac936ff' }], parents: ['0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c', '00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430'] }, '0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c': { tx_id: '0000276ec988df605b56072065f1b9f2395966a3c7c17c692078b2bca43fad8c', version: 1, timestamp: 1578430668, is_voided: false, inputs: [{ value: 4398, token_data: 0, script: 'dqkUfZRahPx5JF7l8qFzwVjiV1tmhweIrA==', decoded: { type: 'P2PKH', address: 'HHy8a7QvQmj727beKFuiYziGb7mi7CdrG3', timelock: null }, token: '00', tx_id: '00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430', index: 0 }], outputs: [{ value: 4396, token_data: 0, script: 'dqkUJdUWQm2UfnCXkwoSj7/2SNmjt5+IrA==', decoded: { type: 'P2PKH', address: 'H9yAeyxwA7zbpovZZTkpqWJZYsE4hHnvmP', timelock: null }, token: '00', spent_by: '00000174753194de2affba45874ef36c92e0ae270442f2410207cf2ee3d06950' }, { value: 2, token_data: 0, script: 'dqkUje1HF10tIOWS36q73Rpbud3BcAyIrA==', decoded: { type: 'P2PKH', address: 'HKTZujeJEBeM22UmRWkuKJaDnzbAfFzwRe', timelock: null }, token: '00', spent_by: '0000340349f9342c4e5eda6f818697f6c1748a81e2ff4b67bc2211d7f8761b11' }], parents: ['00000a6d244e17e22969f2c2ef339a557bc96540bbbef1350c26c445291e5430', '000009fe61f75076b0c1abde1ee1881e4886bad80a09e699cb599b538934ce33'] } },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/stop': {
      post: {
        operationId: 'stopWallet',
        summary: 'Stop a running wallet and remove from store.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        responses: {
          200: {
            description: 'Stop a wallet',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/utxo-filter': {
      get: {
        operationId: 'getUtxosFiltered',
        summary: 'Return utxos and some helpful information regarding it.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'max_utxos',
            in: 'query',
            description: 'Maximum number of utxos to return. Default to MAX_INPUTS (255)',
            required: false,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'token',
            in: 'query',
            description: 'Token to filter the utxos. If not sent, we select only HTR utxos.',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'filter_address',
            in: 'query',
            description: 'Address to filter the utxos.',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'amount_smaller_than',
            in: 'query',
            description: 'Maximum limit of utxo amount to filter the utxos list. We will return only utxos that have an amount lower than this value. Integer representation of decimals, i.e. 100 = 1.00.',
            required: false,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'amount_bigger_than',
            in: 'query',
            description: 'Minimum limit of utxo amount to filter the utxos list. We will return only utxos that have an amount bigger than this value. Integer representation of decimals, i.e. 100 = 1.00.',
            required: false,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'maximum_amount',
            in: 'query',
            description: 'Limit the maximum total amount to return summing all utxos. Integer representation of decimals, i.e. 100 = 1.00.',
            required: false,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'only_available_utxos',
            in: 'query',
            description: 'Get only available utxos, ignoring locked ones. Defaults to false.',
            required: false,
            schema: {
              type: 'boolean',
            },
          },
        ],
        responses: {
          200: {
            description: 'Return utxos',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { total_amount_available: 12000, total_utxos_available: 2, total_amount_locked: 6000, total_utxos_locked: 1, utxos: [{ address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6000, tx_id: '00fff7a3c6eb95ec3343bffcfca9a3a0d3e243462ae7de1f200cdd76716140fb', locked: false, index: 0 }, { address: 'WYiD1E8n5oB9weZ8NMyM3KoCjKf1KCjWAZ', amount: 6000, tx_id: '0000002e785a6ab7cb9a863f66a862c86ca418025c92ef3bb9a7174d7fa31a20', locked: true, index: 0 }, { address: 'WYiD1E8n5oB9weZ8NMyM3KoCjKf1KCjWAZ', amount: 6000, tx_id: '0000002940428f55b1bdc9346b6b253e4a904bd45cc129736028b32c1e9e5d23', locked: false, index: 0 }] },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'invalid-parameter': {
                    summary: 'Invalid parameter',
                    value: { success: false, error: [{ value: '"1"', msg: 'Invalid value', param: 'max_utxos', location: 'query' }] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/utxo-consolidation': {
      post: {
        operationId: 'consolidateUtxos',
        summary: 'Consolidates utxos to a given address.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Data to consolidate utxos.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['destination_address'],
                properties: {
                  destination_address: {
                    type: 'string',
                    description: 'Recipient to the consolidated utxos.',
                  },
                  max_utxos: {
                    type: 'integer',
                    description: 'Maximum number of utxos to aggregate. Default to MAX_INPUTS (255)',
                  },
                  token: {
                    type: 'string',
                    description: 'Token to filter the utxos. If not sent, we select only HTR utxos.',
                  },
                  filter_address: {
                    type: 'string',
                    description: 'Address to filter the utxos.',
                  },
                  amount_smaller_than: {
                    type: 'integer',
                    description: 'Maximum limit of utxo amount to filter the utxos list. We will consolidate only utxos that have an amount lower than this value. Integer representation of decimals, i.e. 100 = 1.00.',
                  },
                  amount_bigger_than: {
                    type: 'integer',
                    description: 'Minimum limit of utxo amount to filter the utxos list. We will consolidate only utxos that have an amount bigger than this value. Integer representation of decimals, i.e. 100 = 1.00.',
                  },
                  maximum_amount: {
                    type: 'integer',
                    description: 'Limit the maximum total amount to consolidate summing all utxos. Integer representation of decimals, i.e. 100 = 1.00.',
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Consolidate utxos to address HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8',
                  value: {
                    destination_address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8',
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Consolidated utxos and consolidation information',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, total_utxos_consolidated: 8, total_amount: 140800, utxos: [{ address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 96000, tx_id: '00dc85e6c5e35525f3e85edebff3905267b48c190c21eaeec6e8e655fcbb5744', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '0000000330f14db1af211f5f0210b3ccc4cb69bc1e7fff19b1e96e8f6b93292b', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '00000012442813722351ab01bbc79bba992fffd16fa066764e491ffd0dbfe87e', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '0000003b34abcb64fcc2999493f66d355bd853110a1a959d35856e598bc80568', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '000000233f187b10ba54b093e0b4f391b27ce747e70f01d573d75ea31e8678a8', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '0000000097cf83a6937199ece5d3ac96cfad239fcb142acc083789eb0c31d3e6', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '0000003b6e6ab2cc751dc736a6a1502eeb2ecca48741f78c52bc27c04bf01412', locked: false, index: 0 }, { address: 'HNnK9wgUVL6Cjzs1K3jpoGgqQTXCqpAnW8', amount: 6400, tx_id: '0000002b145f03de21c841b8e47c019989e16cafa55754bbea8bde00e5170f80', locked: false, index: 0 }] },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'no-available-utxos': {
                    summary: 'No available utxo to consolidate. Check /wallet/utxo-details for available utxos.',
                    value: { success: false, error: 'No available utxo to consolidate.' }
                  },
                  'invalid-parameter': {
                    summary: 'Invalid parameter',
                    value: { success: false, error: [{ msg: 'Invalid value', param: 'destination_address', location: 'body' }] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/address-info': {
      get: {
        operationId: 'getAddressInfo',
        summary: 'Get information of a given address.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
          {
            name: 'address',
            in: 'query',
            description: 'Address to get information of',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'token',
            in: 'query',
            description: 'Filter the information to a custom token or HTR (default: HTR)',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Address information or handled error',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, total_amount_received: 9299200, total_amount_sent: 6400, total_amount_available: 9292800, total_amount_locked: 0, token: '00', index: 0 },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'invalid-parameter': {
                    summary: 'Invalid parameter',
                    value: { success: false, error: [{ value: '"1"', msg: 'Invalid value', param: 'address', location: 'query' }] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/nano-contracts/state': {
      get: {
        operationId: 'nanoState',
        summary: 'Get state of a nano contract.',
        parameters: [
          {
            name: 'x-wallet-id',
            in: 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'id',
            in: 'query',
            description: 'ID of the nano contract to get the state from.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'fields[]',
            in: 'query',
            description: 'List of fields to retrieve the state.',
            required: false,
            schema: {
              type: 'array',
              items: {
                type: 'string',
              }
            },
            examples: {
              'simple fields': {
                summary: 'Only direct fields',
                value: ['token_uid', 'total', 'final_result', 'oracle_script']
              },
              'With dict fields': {
                summary: 'Simple and dict fields (dict fields where the keys are addresses). For an address you must encapsulate the b58 with a\'\'',
                value: [
                  'token_uid',
                  'total',
                  'final_result',
                  'oracle_script',
                  'withdrawals.a\'Wi8zvxdXHjaUVAoCJf52t3WovTZYcU9aX6\'',
                  'address_details.a\'Wi8zvxdXHjaUVAoCJf52t3WovTZYcU9aX6\''
                ]
              },
            }
          },
          {
            name: 'balances[]',
            in: 'query',
            description: 'List of balances to retrieve from contract.',
            required: false,
            schema: {
              type: 'array',
              items: {
                type: 'string',
              }
            },
            examples: {
              balances: {
                summary: 'Example of balances',
                value: ['00', '000008f2ee2059a189322ae7cb1d7e7773dcb4fdc8c4de8767f63022b3731845']
              },
            }
          },
          {
            name: 'calls[]',
            in: 'query',
            description: 'List of private method calls to execute and get result in the contract.',
            required: false,
            schema: {
              type: 'array',
              items: {
                type: 'string',
              }
            },
            examples: {
              calls: {
                summary: 'Example of calls',
                value: ['private_method_1()', 'private_method_2()']
              },
            }
          },
        ],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success to get state from nano',
                    value: {
                      success: true,
                      nc_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
                      blueprint_name: 'Bet',
                      fields: {
                        token_uid: { value: '00' },
                        total: { value: 300 },
                        final_result: { value: '1x0' },
                        oracle_script: { value: '76a91441c431ff7ad5d6ce5565991e3dcd5d9106cfd1e288ac' },
                        'withdrawals.a\'Wi8zvxdXHjaUVAoCJf52t3WovTZYcU9aX6\'': { value: 300 },
                        'address_details.a\'Wi8zvxdXHjaUVAoCJf52t3WovTZYcU9aX6\'': { value: { '1x0': 100 } },
                      }
                    }
                  },
                  error: {
                    summary: 'Invalid nano contract ID',
                    value: {
                      success: false,
                      message: 'Invalid nano contract ID.'
                    }
                  },
                }
              }
            }
          }
        },
      },
    },
    '/wallet/nano-contracts/history': {
      get: {
        operationId: 'nanoHistory',
        summary: 'Get the history of a nano contract.',
        parameters: [
          {
            name: 'x-wallet-id',
            in: 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'id',
            in: 'query',
            description: 'ID of the nano contract to get the history from.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'count',
            in: 'query',
            description: 'Maximum number of items to be returned. Default is 100.',
            required: false,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'after',
            in: 'query',
            description: 'Hash of transaction to offset the result.',
            required: false,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'History of a nano contract',
                    value: {
                      success: true,
                      count: 100,
                      history: {
                        hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                        nonce: 0,
                        timestamp: 1572636346,
                        version: 4,
                        weight: 1,
                        signal_bits: 0,
                        parents: ['1234', '5678'],
                        inputs: [],
                        outputs: [],
                        metadata: {
                          hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                          spent_outputs: [],
                          received_by: [],
                          children: [],
                          conflict_with: [],
                          voided_by: [],
                          twins: [],
                          accumulated_weight: 1,
                          score: 0,
                          height: 0,
                          min_height: 0,
                          feature_activation_bit_counts: null,
                          first_block: null,
                          validation: 'full'
                        },
                        tokens: [],
                        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                        nc_method: 'initialize',
                        nc_args: '0004313233340001000004654d8749',
                        nc_pubkey: '033f5d238afaa9e2218d05dd7fa50eb6f9e55431e6359e04b861cd991ae24dc655'
                      }
                    }
                  },
                  error: {
                    summary: 'Nano contract history index not initialized.',
                    value: {
                      success: false,
                      message: 'Nano contract history index not initialized.'
                    }
                  },
                }
              }
            }
          }
        },
      },
    },
    '/wallet/nano-contracts/oracle-data': {
      get: {
        operationId: 'nanoOracleData',
        summary: 'Get the oracle data.',
        parameters: [
          {
            name: 'x-wallet-id',
            in: 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'oracle',
            in: 'query',
            description: 'The address in base58 that will be used as oracle or the oracle data itself in hex (in this case, it will just be returned the same).',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Get oracle data from an address.',
                    value: {
                      success: true,
                      oracleData: '12345678',
                    }
                  },
                  error: {
                    summary: 'Invalid oracle string.',
                    value: {
                      success: false,
                      message: 'Invalid hex value for oracle script.'
                    }
                  },
                }
              }
            }
          }
        },
      },
    },
    '/wallet/nano-contracts/oracle-signed-result': {
      get: {
        operationId: 'nanoSignedResult',
        summary: 'Get the result signed by the oracle. Returns the string of the argument to be used in the method.',
        parameters: [
          {
            name: 'x-wallet-id',
            in: 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'oracle_data',
            in: 'query',
            description: 'The oracle data. If it\'s not an address, we expect the full input data.',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'result',
            in: 'query',
            description: 'The result to be signed. If the type is bytes, then we expect it in hex.',
            required: true,
            schema: {
              oneOf: [
                {
                  type: 'string',
                },
                {
                  type: 'integer',
                },
                {
                  type: 'number',
                },
                {
                  type: 'boolean',
                },
              ],
            },
          },
          {
            name: 'type',
            in: 'query',
            description: 'The type of the result.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Get oracle signed result.',
                    value: {
                      success: true,
                      oracleData: '12345678:1x0:str',
                    }
                  },
                  error: {
                    summary: 'Address used is from another wallet.',
                    value: {
                      success: false,
                      message: 'Oracle address is not from the loaded wallet.'
                    }
                  },
                }
              }
            }
          }
        },
      },
    },
    '/wallet/nano-contracts/create': {
      post: {
        operationId: 'nanoCreate',
        summary: 'Create a nano contract of a blueprint.',
        parameters: [
          {
            name: 'x-wallet-id',
            in: 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        requestBody: {
          description: 'Data to create the nano contract.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['blueprint_id', 'address', 'data'],
                properties: {
                  blueprint_id: {
                    type: 'string',
                    description: 'Blueprint ID of the new nano contract.'
                  },
                  address: {
                    type: 'string',
                    description: 'Address caller that will sign the nano contract creation transaction.'
                  },
                  data: nanoContractsDataParameter,
                },
              },
              examples: {
                data: {
                  summary: 'Data to create the nano contract',
                  value: {
                    blueprint_id: '1234abcd',
                    address: 'H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt',
                    data: {
                      args: ['abc', '1234abcd'],
                      actions: [
                        {
                          type: 'deposit',
                          token: '00',
                          amount: 100,
                        },
                        {
                          type: 'withdrawal',
                          token: '00',
                          amount: 100,
                          address: 'H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt'
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Create the nano contract',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: true,
                      count: 100,
                      history: {
                        hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                        nonce: 0,
                        timestamp: 1572636346,
                        version: 4,
                        weight: 1,
                        signal_bits: 0,
                        parents: ['1234', '5678'],
                        inputs: [],
                        outputs: [],
                        metadata: {
                          hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                          spent_outputs: [],
                          received_by: [],
                          children: [],
                          conflict_with: [],
                          voided_by: [],
                          twins: [],
                          accumulated_weight: 1,
                          score: 0,
                          height: 0,
                          min_height: 0,
                          feature_activation_bit_counts: null,
                          first_block: null,
                          validation: 'full'
                        },
                        tokens: [],
                        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                        nc_method: 'initialize',
                        nc_args: '0004313233340001000004654d8749',
                        nc_pubkey: '033f5d238afaa9e2218d05dd7fa50eb6f9e55431e6359e04b861cd991ae24dc655'
                      }
                    }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: { success: false, message: "Parameter 'wallet-id' is required." }
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: { success: false, message: 'Invalid wallet-id parameter.' }
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/nano-contracts/execute': {
      post: {
        operationId: 'nanoExecuteMethod',
        summary: 'Execute a nano contract method.',
        parameters: [
          {
            name: 'x-wallet-id',
            in: 'header',
            description: 'Define the key of the corresponding wallet it will be executed the request.',
            required: true,
            schema: {
              type: 'string',
            },
          }
        ],
        requestBody: {
          description: 'Data to execute the nano contract method.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nc_id', 'method', 'address', 'data'],
                properties: {
                  nc_id: {
                    type: 'string',
                    description: 'ID of the nano contract that will have the method executed.'
                  },
                  method: {
                    type: 'string',
                    description: 'Method to execute in the nano contract object.'
                  },
                  address: {
                    type: 'string',
                    description: 'Address caller that will sign the nano contract transaction.'
                  },
                  data: nanoContractsDataParameter,
                }
              },
              examples: {
                data: {
                  summary: 'Data to execute the nano contract method',
                  value: {
                    nc_id: '1234abcd',
                    method: 'method_name',
                    address: 'H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt',
                    data: {
                      args: ['abc', '1234abcd'],
                      actions: [
                        {
                          type: 'deposit',
                          token: '00',
                          amount: 100,
                        },
                        {
                          type: 'withdrawal',
                          token: '00',
                          amount: 100,
                          address: 'H8bt9nYhUNJHg7szF32CWWi1eB8PyYZnbt'
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Transaction for the nano contract method.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      success: true,
                      count: 100,
                      history: {
                        hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                        nonce: 0,
                        timestamp: 1572636346,
                        version: 4,
                        weight: 1,
                        signal_bits: 0,
                        parents: ['1234', '5678'],
                        inputs: [],
                        outputs: [],
                        metadata: {
                          hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                          spent_outputs: [],
                          received_by: [],
                          children: [],
                          conflict_with: [],
                          voided_by: [],
                          twins: [],
                          accumulated_weight: 1,
                          score: 0,
                          height: 0,
                          min_height: 0,
                          feature_activation_bit_counts: null,
                          first_block: null,
                          validation: 'full'
                        },
                        tokens: [],
                        nc_id: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
                        nc_method: 'method_name',
                        nc_args: '0004313233340001000004654d8749',
                        nc_pubkey: '033f5d238afaa9e2218d05dd7fa50eb6f9e55431e6359e04b861cd991ae24dc655'
                      }
                    }
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'no-wallet-id': {
                    summary: 'No wallet id parameter',
                    value: { success: false, message: "Parameter 'wallet-id' is required." }
                  },
                  'invalid-wallet-id': {
                    summary: 'Wallet id parameter is invalid',
                    value: { success: false, message: 'Invalid wallet-id parameter.' }
                  },
                },
              },
            },
          },
        },
      },
    },
    '/configuration-string': {
      get: {
        operationId: 'getTokenConfigurationString',
        summary: 'Get configuration string of a token.',
        parameters: [
          {
            name: 'token',
            in: 'query',
            description: 'Token to get the configuration string.',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'Configuration string of the token or error in case of invalid token uid.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, configurationString: '[Test 1:TST1:007c9d497135e10dcba984f0b893804d7cb06721c800064cfbe05fafc138faca:5dd518cc]' },
                  },
                  'invalid-token': {
                    summary: 'Token uid is invalid',
                    value: { success: false, message: 'Invalid token uid.' }
                  }
                },
              },
            },
          },
        },
      },
    },
    '/reload-config': {
      post: {
        operationId: 'reloadConfig',
        summary: 'Reload configuration of the wallet.',
        responses: {
          200: {
            description: 'A JSON with the indication of success or error.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true },
                  },
                  'Non-recoverable config change': {
                    summary: 'The running app cannot successfully recover from this change.',
                    value: { success: false, error: 'A non recoverable change in the config was made, the service will shutdown.' }
                  }
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Return the health of the wallet headless.',
        parameters: [
          {
            name: 'wallet_ids',
            in: 'query',
            description: 'Wallet ids to check, comma-separated. If not provided, will not check any wallet.',
            required: false,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'include_fullnode',
            in: 'query',
            description: 'Whether fullnode health should be checked and included in the response.',
            required: false,
            schema: {
              type: 'boolean',
            },
          },
          {
            name: 'include_tx_mining',
            in: 'query',
            description: 'Whether tx mining service health should be checked and included in the response.',
            required: false,
            schema: {
              type: 'boolean',
            },
          }
        ],
        responses: {
          200: {
            description: 'A JSON with the health object. It will contain info about all components that were enabled and provided wallet ids.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: {
                      status: 'pass',
                      description: 'Wallet-headless health',
                      checks: {
                        'Wallet <wallet-id>': [{
                          status: 'pass',
                          componentType: 'internal',
                          componentName: 'Wallet <wallet-id>',
                          output: 'Wallet is ready',
                        }],
                        'Wallet <wallet-id-2>': [{
                          status: 'pass',
                          componentType: 'internal',
                          componentName: 'Wallet <wallet-id-2>',
                          output: 'Wallet is ready',
                        }],
                        fullnode: [{
                          status: 'pass',
                          componentType: 'fullnode',
                          componentName: 'Fullnode <fullnode_url>',
                          output: 'Fullnode is responding',
                        }],
                        txMining: [{
                          status: 'pass',
                          componentType: 'service',
                          componentName: 'TxMiningService <tx_mining_url>',
                          output: 'Tx Mining Service is healthy',
                        }]
                      }
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'A JSON object with the reason for the error.',
            content: {
              'application/json': {
                examples: {
                  'invalid-wallet-ids': {
                    summary: 'Invalid wallet id',
                    value: { success: false, message: 'Invalid wallet id parameter.' }
                  },
                  'no-component-included': {
                    summary: 'No component was included in the request',
                    value: { success: false, message: 'At least one component must be included in the health check' }
                  },
                },
              },
            },
          },
          503: {
            description: 'A JSON with the health object. It will contain info about all components that were checked.',
            content: {
              'application/json': {
                examples: {
                  unhealthy: {
                    summary: 'Unhealthy wallet headless',
                    value: {
                      status: 'fail',
                      description: 'Wallet-headless health',
                      checks: {
                        'Wallet <wallet-id>': [{
                          status: 'pass',
                          componentType: 'internal',
                          componentName: 'Wallet <wallet-id>',
                          output: 'Wallet is ready',
                        }],
                        'Wallet <wallet-id-2>': [{
                          status: 'pass',
                          componentType: 'internal',
                          componentName: 'Wallet <wallet-id-2>',
                          output: 'Wallet is ready',
                        }],
                        fullnode: [{
                          status: 'fail',
                          componentType: 'fullnode',
                          componentName: 'Fullnode <fullnode_url>',
                          output: 'Fullnode reported as unhealthy: <fullnode response>',
                        }],
                        txMining: [{
                          status: 'pass',
                          componentType: 'service',
                          componentName: 'TxMiningService <tx_mining_url>',
                          output: 'Tx Mining Service is healthy',
                        }]
                      }
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/wallet/config/last-loaded-address-index': {
      get: {
        operationId: 'getLastLoadedAddressIndex',
        summary: 'Get the last loaded address index of a wallet.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        responses: {
          200: {
            description: 'Last address index loaded or handled error',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true, index: 74 },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'invalid-parameter': {
                    summary: 'Invalid parameter',
                    value: { success: false, error: [{ value: '"1"', msg: 'Invalid value', param: 'address', location: 'query' }] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/config/index-limit/load-more-addresses': {
      post: {
        operationId: 'indexLimitloadMoreAddresses',
        summary: 'Load more addresses by pushing the end index of a wallet configured to index-limit scanning policy.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Count of addresses to load.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['count'],
                properties: {
                  count: {
                    type: 'integer',
                    description: 'Count of addresses to load.',
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Load 10 more addresses.',
                  value: {
                    count: 10,
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Success confirmation or handled error',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'invalid-parameter': {
                    summary: 'Invalid parameter',
                    value: { success: false, error: [{ value: '"1"', msg: 'Invalid value', param: 'address', location: 'query' }] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
    '/wallet/config/index-limit/last-index': {
      post: {
        operationId: 'indexLimitSetLastIndex',
        summary: 'Set the last address index of a wallet configured to index-limit scanning policy.',
        parameters: [
          { $ref: '#/components/parameters/XWalletIdParameter' },
        ],
        requestBody: {
          description: 'Set the last loaded index on a wallet configured to index-limit scanning policy.',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['index'],
                properties: {
                  index: {
                    type: 'integer',
                    description: 'Last address index to set.',
                  },
                }
              },
              examples: {
                data: {
                  summary: 'Load all addresses up to 150.',
                  value: {
                    index: 150,
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Success confirmation or handled error',
            content: {
              'application/json': {
                examples: {
                  success: {
                    summary: 'Success',
                    value: { success: true },
                  },
                  'wallet-not-ready': {
                    summary: 'Wallet is not ready yet',
                    value: { success: false, message: 'Wallet is not ready.', state: 1 }
                  },
                  'invalid-parameter': {
                    summary: 'Invalid parameter',
                    value: { success: false, error: [{ value: '"1"', msg: 'Invalid value', param: 'address', location: 'query' }] }
                  },
                  ...commonExamples.xWalletIdErrResponseExamples,
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Generates the Api Docs according to the current configurations of the Headless Wallet
 */
function getApiDocs() {
  // Obtaining base data
  const config = settings.getConfig();
  const apiDocs = cloneDeep(defaultApiDocs);

  // Adding optional API Key docs
  if (config.http_api_key) {
    apiDocs.components.securitySchemes = {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-KEY',
      },
    };
    apiDocs.security = [
      {
        ApiKeyAuth: [],
      }
    ];
  }

  // Binding server address and port, if informed
  if (config.http_bind_address) {
    const portStr = config.http_port ? `:${config.http_port}` : '';
    apiDocs.servers[0].url = `https://${config.http_bind_address}${portStr}`;
  }

  // Data ready to serve
  return apiDocs;
}

module.exports = {
  getApiDocs
};
