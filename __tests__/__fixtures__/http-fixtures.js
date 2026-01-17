export default {
  'http://fake.txmining:8084/health': {
    status: 'pass'
  },
  'http://fakehost:8083/v1a/version': {
    version: '0.38.4',
    network: 'testnet-foxtrot',
    min_weight: 8,
    min_tx_weight: 8,
    min_tx_weight_coefficient: 0,
    min_tx_weight_k: 0,
    token_deposit_percentage: 0.01,
    reward_spend_min_blocks: 0,
    max_number_inputs: 255,
    max_number_outputs: 255,
  },
  'http://fakehost:8083/v1a/health': {
    status: 'pass',
  },
  '/thin_wallet/address_history': {
    success: true,
    history: [
      {
        tx_id:
          '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
        version: 0,
        weight: 24.421463768438276,
        timestamp: 1615256247,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 12,
      },
      {
        tx_id:
          '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce',
        version: 0,
        weight: 21,
        timestamp: 1615256233,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '000007221844712e6a59fdec5ce4e49bbcd3aff20174a2aa5d8a1270035fb14d',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 10,
      },
      {
        tx_id:
          '0000005fb257e5dc1ce16353a93c5f03287c951c17e425139565b91a2a11672f',
        version: 0,
        weight: 25.237039197300852,
        timestamp: 1615256249,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 13,
      },
      {
        tx_id:
          '000000e84e4e30daa3be4a6b5c71e2198c8d2e3aea36786dc0567c771c7edede',
        version: 0,
        weight: 21,
        timestamp: 1615256210,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000035822a76a9dee0ed2c023b5699c97d08755301aa6e6e357f72ebf98053c',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 2,
      },
      {
        tx_id:
          '0000010f2704effbd7f45d31fac77b318efe6f92db1d5b120c379fbbea5b614b',
        version: 0,
        weight: 21,
        timestamp: 1615256222,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '00000354f4e9388dfa06b193a04e46628c50c78c7df2db617f5e5c231ab4d7d7',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 6,
      },
      {
        tx_id:
          '0000031a44c74d18a543df8e3b29602d4f5442b0f36d3686521ed8e975e7f3b3',
        version: 0,
        weight: 21,
        timestamp: 1615256224,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000010f2704effbd7f45d31fac77b318efe6f92db1d5b120c379fbbea5b614b',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 7,
      },
      {
        tx_id:
          '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca',
        version: 0,
        weight: 21,
        timestamp: 1615256236,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 11,
      },
      {
        tx_id:
          '00000354f4e9388dfa06b193a04e46628c50c78c7df2db617f5e5c231ab4d7d7',
        version: 0,
        weight: 21,
        timestamp: 1615256218,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351eb',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 12,
      },
      {
        tx_id:
          '0000035822a76a9dee0ed2c023b5699c97d08755301aa6e6e357f72ebf98053c',
        version: 0,
        weight: 21,
        timestamp: 1615256209,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000033139d08176d1051fb3a272c3610457f0c7f686afbe0afe3d37f966db85',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 13,
      },
      {
        tx_id:
          '000004e31d32f699cc4d4cda8a31037f2197f2e18b2192f4f9225bf0fbb3760c',
        version: 0,
        weight: 21,
        timestamp: 1615256212,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '000000e84e4e30daa3be4a6b5c71e2198c8d2e3aea36786dc0567c771c7edede',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 14,
      },
      {
        tx_id:
          '0000072046eb8c06b39f45c46dcaac87ae7baecce742705b94737aa064a82f4b',
        version: 0,
        weight: 21,
        timestamp: 1615256228,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000031a44c74d18a543df8e3b29602d4f5442b0f36d3686521ed8e975e7f3b3',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 15,
      },
      {
        tx_id:
          '000007221844712e6a59fdec5ce4e49bbcd3aff20174a2aa5d8a1270035fb14d',
        version: 0,
        weight: 21,
        timestamp: 1615256230,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '09',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '09',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '0000072046eb8c06b39f45c46dcaac87ae7baecce742705b94737aa064a82f4b',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        tokens: [],
        height: 16,
        token_name: '09',
        token_symbol: '09',
      },
      {
        tx_id:
          '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351eb',
        version: 0,
        weight: 21,
        timestamp: 1615256215,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: 32522094000,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '000004e31d32f699cc4d4cda8a31037f2197f2e18b2192f4f9225bf0fbb3760c',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 17,
      },
      {
        tx_id:
          '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
        version: 2,
        weight: 8.000001,
        timestamp: 1615493636,
        is_voided: false,
        inputs: [
          {
            value: 6400,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            tx_id:
              '0000000205391d95eda5c347f7c382be598ba4dfe3d8c0bf1e1f111fde478109',
            index: 0,
          },
        ],
        outputs: [
          {
            value: 6399,
            token_data: 0,
            script: 'dqkU/qcZVmiK7oEMzDyVX9kwfldkR8CIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 100,
            token_data: 1,
            script: 'dqkU/qcZVmiK7oEMzDyVX9kwfldkR8CIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token:
              '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 1,
            token_data: 129,
            script: 'dqkUDlPrlqwNSzACTYkmsre5+Wgs6yaIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token:
              '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 2,
            token_data: 129,
            script: 'dqkUaGEUP33GsvnIUlMV7+b82hYKeVyIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token:
              '00da712d64e04866c8c9aa8fceca70e80d1693864176b6b443220cf29adab5ed',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
        ],
        token_name: '01',
        token_symbol: '01',
        tokens: [],
        height: 18
      },
      {
        tx_id:
          '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
        version: 0,
        weight: 21,
        timestamp: 1615256215,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 1,
            token_data: 129,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: 32522094000,
            },
            token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 1,
            token_data: 129,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
              timelock: null,
            },
            token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 1,
            token_data: 129,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'P2SH',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 200,
            token_data: 1,
            script: 'dqkU/qcZVmiK7oEMzDyVX9kwfldkR8CIrA==',
            decoded: {
              type: 'P2SH',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token:
              '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 2,
            token_data: 129,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'P2SH',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 6400,
            token_data: 0,
            script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
            decoded: {
              type: 'MultiSig',
              address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
              timelock: null
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '000004e31d32f699cc4d4cda8a31037f2197f2e18b2192f4f9225bf0fbb3760c',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 19,
        tokens: ['0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351ee']
      },
      {
        tx_id:
          '00991cd24536f402ef60d37df3031e0cff1d4e78cdbf6101e3cde4217a7c4cc3',
        version: 0,
        weight: 21,
        timestamp: 1615256216,
        is_voided: false,
        inputs: [],
        outputs: [
          {
            value: 10,
            token_data: 1,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp',
            },
            token: '04',
            spent_by: null,
            selected_as_input: false,
          },
          {
            value: 10,
            token_data: 0,
            script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp',
            },
            token: '00',
            spent_by: null,
            selected_as_input: false,
          },
        ],
        parents: [
          '000004e31d32f699cc4d4cda8a31037f2197f2e18b2192f4f9225bf0fbb3760c',
          '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
          '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
        ],
        height: 19,
        tokens: ['04']
      },
    ],
    has_more: false,
  },
  '/v1a/push_tx': {
    success: true,
    message: '',
    tx: {
      hash: '0047b13eff5d52fe3111930daf7c141d5706794323439a867b809ddd34d664de',
      nonce: 39,
      timestamp: 1615256906,
      version: 1,
      weight: 8.000001,
      parents: [
        '00975897028ceb037307327c953f5e7ad4d3f42402d71bd3d11ecb63ac39f01a',
        '00e161a6b0bee1781ea9300680913fb76fd0fac4acab527cd9626cc1514abdc9',
      ],
      inputs: [
        {
          tx_id:
            '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '000000526cc60ab04b1a4f6b67620ce900ce31ef46f775847ce572236ca958ce',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000005fb257e5dc1ce16353a93c5f03287c951c17e425139565b91a2a11672f',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '000000e84e4e30daa3be4a6b5c71e2198c8d2e3aea36786dc0567c771c7edede',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000010f2704effbd7f45d31fac77b318efe6f92db1d5b120c379fbbea5b614b',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000031a44c74d18a543df8e3b29602d4f5442b0f36d3686521ed8e975e7f3b3',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000034e42c9f2a7a7ab720e2f34bc6701679bb70437e7b7d53b6328aa3a88ca',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '00000354f4e9388dfa06b193a04e46628c50c78c7df2db617f5e5c231ab4d7d7',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000035822a76a9dee0ed2c023b5699c97d08755301aa6e6e357f72ebf98053c',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '000004e31d32f699cc4d4cda8a31037f2197f2e18b2192f4f9225bf0fbb3760c',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000072046eb8c06b39f45c46dcaac87ae7baecce742705b94737aa064a82f4b',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '000007221844712e6a59fdec5ce4e49bbcd3aff20174a2aa5d8a1270035fb14d',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000073b972162f70061f61cf0082b7a47263cc1659a05976aca5cd01b3351eb',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000002582147695287243d14b79700988de229d39a8e62a2599f0796e40913c',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000013b0937fc6d79b28bb987ac5f8fedbb52314a190913c66691c285a58eac',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '0000013beffdc39f185ac8c135718bcca1c5a17c6fbec0001a09b0bbe86d6ffb',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '00000255e91b644ad7f7a1ca2ce5aad7a346ef73540d2338d73ab24256718f1d',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
        {
          tx_id:
            '000002d4d2ed6480e6f422d688325bb9cc0d1a92cc2bb30d886f454bd4d43997',
          index: 0,
          data:
            'RzBFAiEAukSrGrHahG+E0vjsi/PoBR0sgNS8guxcFY/dOYr3lakCIGkIVzJr8MM3e876RB2EpLDQOUglezQw5BlBHTFM3ERvIQMKqNgAzVH7U5JyP67dzt+RZ7ggp21hKO6D6a4SLH1qqw==',
        },
      ],
      outputs: [
        {
          value: 115200,
          token_data: 0,
          script: 'dqkUVvf1nM1vemtqwnMKE6SAITXvXFqIrA==',
        },
      ],
      tokens: [],
    },
  },
  'submit-job': {
    success: true,
    job_id: '123',
    expected_total_time: 1,
    status: 'mining',
  },
  'job-status': {
    success: true,
    expected_total_time: 0,
    job_id: '123',
    status: 'done',
    tx: {
      parents: [
        '00000257054251161adff5899a451ae974ac62ca44a7a31179eec5750b0ea406',
        '00000b8792cb13e8adb51cc7d866541fc29b532e8dec95ae4661cf3da4d42cb4',
      ],
      nonce: '0x4D2',
      timestamp: 123456,
    },
  },
  '/thin_wallet/token': {
    name: 'Test 1',
    symbol: 'TST1',
    success: true,
    version: 1,
    mint: [
      {
        tx_id: '007c9d497135e10dcba984f0b893804d7cb06721c800064cfbe05fafc138faca',
        index: 1
      }
    ],
    melt: [
      {
        tx_id: '007c9d497135e10dcba984f0b893804d7cb06721c800064cfbe05fafc138faca',
        index: 2
      }
    ],
    total: 100,
    transactions_count: 1
  },
  '/transaction': {
    success: true,
    tx: {
      hash: '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
      version: 0,
      nonce: '0',
      timestamp: 1572636346,
      weight: 1,
      signal_bits: 0,
      parents: ['1234', '5678'],
      inputs: [],
      outputs: [
        {
          value: 6400,
          token_data: 0,
          script: 'dqkUsmE9zshkgB58piBD7ETUV0e/NgmIrA==',
          decoded: {
            type: 'P2PKH',
            address: 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN',
            timelock: null,
            value: 6400,
            token_data: 0,
          },
          token: '00',
          spent_by: null,
          selected_as_input: false,
        },
        {
          value: 6400,
          token_data: 0,
          script: 'qRTqJUJmzEmBNvhkmDuZ4JxcMh5/ioc=',
          decoded: {
            type: 'MultiSig',
            address: 'wgyUgNjqZ18uYr4YfE2ALW6tP5hd8MumH5',
            timelock: null,
            value: 6400,
            token_data: 0,
          },
          token: '00',
          spent_by: null,
          selected_as_input: false,
        },
      ],
      tokens: [],
      raw: '',
    },
    spent_outputs: {},
    meta: {
      hash: '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
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
      validation: 'full',
      first_block_height: 1234,
    },
  },
  '/transaction?id=000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16': {
    success: true,
    tx: {
      hash: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
      nonce: '61170',
      timestamp: 1748361389,
      version: 1,
      weight: 17.441808058055496,
      signal_bits: 0,
      parents: [
        '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
        '039906854ce6309b3180945f2a23deb9edff369753f7082e19053f5ac11bfbae'
      ],
      inputs: [],
      outputs: [],
      tokens: [],
      nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
      nc_blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
      nc_method: 'initialize',
      nc_args: '03200000298f16599418b0475762c9ce570fe966fd8a62fd933888a96a16c0b893b720000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef6957196bd49',
      nc_address: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
      nc_context: {
        actions: [],
        caller_id: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
        timestamp: 1748361396
      },
      raw: '00010000004031711a553875276835e0ad02000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695039906854ce6309b3180945f2a23deb9edff369753f7082e19053f5ac11bfbae0000eef210013cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e7715950a696e697469616c697a65004703200000298f16599418b0475762c9ce570fe966fd8a62fd933888a96a16c0b893b720000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef6957196bd490049d6e3295bdb3fd0b01c626fe3d088499d0511aba4806d6159006a47304502210096279fdcc336040aa9cb517241d968b73738de19102ed5f893891a5131644ab00220424091f8efe7b2413669d034e907215dd0ab7386cf983d22019a922d6b4385692102f327b0e8f23b5a714d14786b81f5bd1254cdd6fd096c8f606f743dc90011c2ac'
    },
    meta: {
      hash: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
      spent_outputs: [],
      received_by: [],
      children: [
        '000000234b8a4d9024fdd8cfa83a8a3c74edbab644c61e81f2d62dbc586ec4af',
        '0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50',
        '00000027e3066bbae2e00d25b9b00bdfb6930ff6c4bf2fe35ea830f9e9d8ea48',
        '000000232911c20646ab3608dde21fd93d88414e1ee1a9654e11bc103e6d274d',
      ],
      conflict_with: [],
      voided_by: [],
      twins: [],
      accumulated_weight_raw: '178036',
      score_raw: '0',
      min_height: 18,
      height: 0,
      feature_activation_bit_counts: [],
      first_block: '000000234b8a4d9024fdd8cfa83a8a3c74edbab644c61e81f2d62dbc586ec4af',
      validation: 'full',
      nc_block_root_id: null,
      nc_calls: [
        [
          '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
          '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
          'initialize'
        ]
      ],
      nc_execution: 'success',
      accumulated_weight: 17.441809467146022,
      score: 0.0,
      first_block_height: 19
    },
    spent_outputs: {}
  },
  '/transaction?id=0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50': {
    success: true,
    tx: {
      hash: '0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50',
      nonce: '3680606',
      timestamp: 1748361399,
      version: 1,
      weight: 21.77244466692441,
      signal_bits: 0,
      parents: ['000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16', '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695'],
      inputs: [
        {
          value: 50000,
          token_data: 1,
          script: 'dqkUlAFxSzjwTo7LN8gk5FC/2SDhz+iIrA==',
          decoded: {
            type: 'P2PKH',
            address: 'WcAccYo8pMZLVJ573KmSHGacKDUeCaYtki',
            timelock: null,
            value: 50000,
            token_data: 1
          },
          tx_id: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
          index: 1
        }
      ],
      outputs: [
        {
          value: 49900,
          token_data: 1,
          script: 'dqkU6ymVHxS2pJf/bHDgpHEQp4KlnASIrA==',
          decoded: {
            type: 'P2PKH',
            address: 'Wk7TVDBzd5vg2EmKWTxk4Tt11TXoPB5Woi',
            timelock: null,
            value: 49900,
            token_data: 1
          }
        }
      ],
      tokens: [
        {
          uid: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
          name: 'Alice Token',
          symbol: 'alice'
        }
      ],
      nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
      nc_blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
      nc_method: 'bet',
      nc_args: '021949d6e3295bdb3fd0b01c626fe3d088499d0511aba4806d6159175265616c2d4d616472696432783242617263656c6f6e61',
      nc_address: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
      nc_context: {
        actions: [
          {
            type: 'deposit',
            token_uid: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
            amount: 100
          }
        ],
        caller_id: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
        timestamp: 1748361399
      },
      raw: '0001010101000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef69501006a473045022100a341137acf18c9ac4b42b13d2b8db23a719d2e79510ece61408dffd42cd126e502202f38f44530f990fbb28a3aa9a7a01878dc16e8dcbba341320bb6b9acff5458f5210201917d707d8346ba1daf7225fc4037328085f9291e763e736e26fe74e62d5fd50000c2ec01001976a914eb29951f14b6a497ff6c70e0a47110a782a59c0488ac4035c5beef0668f36835e0b702000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef6950038295e1001000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16036265740033021949d6e3295bdb3fd0b01c626fe3d088499d0511aba4806d6159175265616c2d4d616472696432783242617263656c6f6e610101010000006449d6e3295bdb3fd0b01c626fe3d088499d0511aba4806d615900694630440220657cc9e7e362ad20bcf5008d0085943e984f63dc513f5523aaff53d08050a4bb022004c2e32ef271f2544edf48b699456f307b13dd4e468a47e5570f77a5bf4132022102f327b0e8f23b5a714d14786b81f5bd1254cdd6fd096c8f606f743dc90011c2ac'
    },
    meta: {
      hash: '0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50',
      spent_outputs: [[0, []]],
      received_by: [],
      children: [
        '00000027e3066bbae2e00d25b9b00bdfb6930ff6c4bf2fe35ea830f9e9d8ea48',
        '000000232911c20646ab3608dde21fd93d88414e1ee1a9654e11bc103e6d274d',
      ],
      conflict_with: [],
      voided_by: [],
      twins: [],
      accumulated_weight_raw: '3582275',
      score_raw: '0',
      min_height: 18,
      height: 0,
      feature_activation_bit_counts: [],
      first_block: '00000027e3066bbae2e00d25b9b00bdfb6930ff6c4bf2fe35ea830f9e9d8ea48',
      validation: 'full',
      nc_block_root_id: null,
      nc_calls: [
        [
          '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
          '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
          'bet'
        ]
      ],
      nc_execution: 'success',
      accumulated_weight: 21.772444662066132,
      score: 0.0,
      first_block_height: 20
    },
    spent_outputs: {}
  },
  '/getmininginfo': {
    success: true,
    blocks: 1242,
  },
  '/feature': {
    block_hash: '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b',
    block_height: 1242,
    features: [],
  },
  '/nano_contract/state': {
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
  },
  '/nano_contract/history': {
    success: true,
    history: [
      {
        hash: '0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50',
        nonce: 3680606,
        timestamp: 1748361399,
        version: 1,
        weight: 21.77244466692441,
        signal_bits: 0,
        parents: [
          '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
          '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695'
        ],
        inputs: [
          {
            value: 50000,
            token_data: 1,
            script: 'dqkUlAFxSzjwTo7LN8gk5FC/2SDhz+iIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'WcAccYo8pMZLVJ573KmSHGacKDUeCaYtki',
              timelock: null
            },
            token: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
            tx_id: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
            index: 1
          }
        ],
        outputs: [
          {
            value: 49900,
            token_data: 1,
            script: 'dqkU6ymVHxS2pJf/bHDgpHEQp4KlnASIrA==',
            decoded: {
              type: 'P2PKH',
              address: 'Wk7TVDBzd5vg2EmKWTxk4Tt11TXoPB5Woi',
              timelock: null
            },
            token: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
            spent_by: null
          }
        ],
        tokens: [
          '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695'
        ],
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        nc_blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        nc_method: 'bet',
        nc_args: '021949d6e3295bdb3fd0b01c626fe3d088499d0511aba4806d6159175265616c2d4d616472696432783242617263656c6f6e61',
        nc_address: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
        nc_context: {
          actions: [
            {
              type: 'deposit',
              token_uid: '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
              amount: 100
            }
          ],
          caller_id: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
          timestamp: 1748361466
        },
        tx_id: '0000045a5460cc1d00489c39ae4438c92d26180d996243d2dca8f7c4c62b7b50',
        is_voided: false,
        first_block: '00000027e3066bbae2e00d25b9b00bdfb6930ff6c4bf2fe35ea830f9e9d8ea48'
      },
      {
        hash: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        nonce: 61170,
        timestamp: 1748361389,
        version: 1,
        weight: 17.441808058055496,
        signal_bits: 0,
        parents: [
          '000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef695',
          '039906854ce6309b3180945f2a23deb9edff369753f7082e19053f5ac11bfbae'
        ],
        inputs: [],
        outputs: [],
        tokens: [],
        nc_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        nc_blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
        nc_method: 'initialize',
        nc_args: '03200000298f16599418b0475762c9ce570fe966fd8a62fd933888a96a16c0b893b720000002977efa41879690fb304cb03583e5a8b74080401f770633faf9091ef6957196bd49',
        nc_address: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
        nc_context: {
          actions: [],
          caller_id: 'WiGFcSYHhfRqWJ7PXYvhjULXtXCYD1VFdS',
          timestamp: 1748361396
        },
        tx_id: '000033ef9affbd741d477ff62450253a60b5a082c6cf803340ad1a6369ab9f16',
        is_voided: false,
        first_block: '000000234b8a4d9024fdd8cfa83a8a3c74edbab644c61e81f2d62dbc586ec4af'
      }
    ]
  },
  '/nano_contract/blueprint/info': {
    id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
    name: 'Test',
    public_methods: {
      initialize: {
        args: [
          { type: 'int', name: 'a' },
          { type: 'bytes', name: 'b' }
        ]
      },
      bet: {
        args: [
          { type: 'int', name: 'a' },
          { type: 'bytes', name: 'b' }
        ]
      },
    },
  },
  '/nano_contract/oracle-data': {
    success: true,
    oracleData: '1234'
  },
  '/nano_contract/oracle-signed-result': {
    success: true,
    signedResult: '123456,1x0,str'
  },
};
