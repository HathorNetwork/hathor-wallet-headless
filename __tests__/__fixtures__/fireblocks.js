export default {
  public_key_info: {
    status: 0,
    algorithm: 'MPC_ECDSA_SECP256K1',
    derivationPath: [44, 280, 0, 0, 0],
    publicKey: '030aa8d800cd51fb5392723faeddcedf9167b820a76d6128ee83e9ae122c7d6aab',
  },
  transaction_status: config => ([200, {
    id: 'af963ba1-e97e-4219-9161-5ad4f2873956',
    createdAt: 1713365600560,
    lastUpdated: 1713365606928,
    source: { type: 'VAULT_ACCOUNT', name: 'Vault', subType: '' },
    destination: { type: 'UNKNOWN', name: 'N/A', subType: '' },
    amount: null,
    fee: -1,
    networkFee: -1,
    netAmount: -1,
    sourceAddress: '',
    destinationAddress: '',
    destinationAddressDescription: '',
    destinationTag: '',
    status: 'COMPLETED',
    txHash: '',
    subStatus: '',
    signedBy: [],
    createdBy: 'af963ba1-e97e-4219-9161-5ad4f2873956',
    rejectedBy: '',
    amountUSD: null,
    addressType: '',
    note: 'Hathor tx sent from headless wallet using raw signing',
    exchangeTxId: '',
    requestedAmount: null,
    feeCurrency: '',
    operation: 'RAW',
    amountInfo: {},
    feeInfo: {},
    destinations: [],
    externalTxId: config.url.split('/').pop(),
    blockInfo: {},
    signedMessages: [
      {
        derivationPath: [44, 280, 0, 0, 0],
        algorithm: 'MPC_ECDSA_SECP256K1',
        publicKey: '030aa8d800cd51fb5392723faeddcedf9167b820a76d6128ee83e9ae122c7d6aab',
        signature: {
          fullSig: '086fa4540dc49e8f1a14221a7ce8a9668e1cfc93e6bb79c8633b3312a578601a5189b6bfb0f0dc7943c9968d761cba0fb2ad007bbc177c745a7cd5e385c0383e',
          r: '086fa4540dc49e8f1a14221a7ce8a9668e1cfc93e6bb79c8633b3312a578601a',
          s: '5189b6bfb0f0dc7943c9968d761cba0fb2ad007bbc177c745a7cd5e385c0383e',
          v: 0
        },
        content: config.url.split('/').pop(),
      },
      {
        derivationPath: [44, 280, 0, 0, 3],
        algorithm: 'MPC_ECDSA_SECP256K1',
        publicKey: '03259e967bf44a0a8800c74fdd45a577e8c803802737edfd3b780e16ced4fc72be',
        signature: {
          fullSig: '086fa4540dc49e8f1a14221a7ce8a9668e1cfc93e6bb79c8633b3312a578601a5189b6bfb0f0dc7943c9968d761cba0fb2ad007bbc177c745a7cd5e385c0383e',
          r: '086fa4540dc49e8f1a14221a7ce8a9668e1cfc93e6bb79c8633b3312a578601a',
          s: '5189b6bfb0f0dc7943c9968d761cba0fb2ad007bbc177c745a7cd5e385c0383e',
          v: 0
        },
        content: config.url.split('/').pop(),
      },
    ],
    extraParameters: {
      rawMessageData: {
        messages: [
          {
            derivationPath: [44, 280, 0, 0, 0],
            content: config.url.split('/').pop(),
          }
        ],
        algorithm: 'MPC_ECDSA_SECP256K1',
      }
    },
  }]),
};
