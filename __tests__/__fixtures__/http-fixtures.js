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
      hash: '00000008707722cde59ac9e7f4d44efbd3a5bd5f244223816ee676d328943b1b'
    },
    meta: {
      first_block_height: 1234,
    },
  },
  '/transaction?id=5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a': {
    success: true,
    tx: {
      hash: '5c02adea056d7b43e83171a0e2d226d564c791d583b32e9a404ef53a2e1b363a',
      version: 4,
      nc_blueprint_id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595',
    },
  },
  '/getmininginfo': {
    success: true,
    blocks: 1242,
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
    count: 100,
    history: [{
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
    }]
  },
  '/nano_contract/blueprint': {
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
