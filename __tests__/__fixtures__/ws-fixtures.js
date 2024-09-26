export default {
  capabilities: { capabilities: ['history-streaming'] },
  dashboard: {
    transactions: 2,
    blocks: 1537,
    best_block_height: 1536,
    hash_rate: 355673.9807380554,
    peers: 0,
    type: 'dashboard:metrics',
    time: 1615218985.77608,
  },
  melt: {
    address: 'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
    history: {
      tx_id: '00f69d6b861fc70e6b1ed9896e0184c3e8d94b01ae1921cfc42176ce91192fb6',
      version: 1,
      weight: 8.000001,
      timestamp: 1615093636,
      is_voided: false,
      inputs: [
        {
          value: 2,
          token_data: 129,
          script: 'dqkUVvf1nM1vemtqwnMKE6SAITXvXFqIrA==',
          decoded: {
            type: 'P2PKH',
            address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
            timelock: null,
          },
          token:
            '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
          tx_id:
            '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
          index: 3,
        },
        {
          value: 100,
          token_data: 1,
          script: 'dqkUX1XQjI1bgpXys7keNvHcewIVMsyIrA==',
          decoded: {
            type: 'P2PKH',
            address: 'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
            timelock: null,
          },
          token:
            '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
          tx_id:
            '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
          index: 1,
        },
      ],
      outputs: [
        {
          value: 2,
          token_data: 129,
          script: 'dqkUxwjHrGjBoPy1Zvgc8xpWNEwBe1OIrA==',
          decoded: {
            type: 'P2PKH',
            address: 'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
            timelock: null,
          },
          token:
            '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
          spent_by: null,
        },
        {
          value: 1,
          token_data: 0,
          script: 'dqkUDoWv/T10Ovt/nLTx/EsBVTRRvs+IrA==',
          decoded: {
            type: 'P2PKH',
            address: 'WWbt2ww4W45YLUAumnumZiyWrABYDzCTdN',
            timelock: null,
          },
          token: '00',
          spent_by: null,
        },
      ],
      parents: [
        '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        '0000035822a76a9dee0ed2c023b5699c97d08755301aa6e6e357f72ebf98053c',
      ],
      height: 6
    },
    type: 'wallet:address_history',
  },
};
