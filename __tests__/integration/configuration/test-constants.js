import { constants as libConstants, transactionUtils } from '@hathor/wallet-lib';

/**
 * @type {Record<string,WalletData>}
 */
export const WALLET_CONSTANTS = {
  genesis: {
    walletId: 'genesiswallet',
    words: 'avocado spot town typical traffic vault danger century property shallow divorce festival spend attack anchor afford rotate green audit adjust fade wagon depart level',
    addresses: [
      'WPhehTyNHTPz954CskfuSgLEfuKXbXeK3f',
      'WY1URKUnqCTyiixW1Dw29vmeG99hNN4EW6', // Genesis funds, index 1
      'WRTFYzhTHkfYwub8EWVtAcUgbdUpsYMBpb',
      'WhpJeUtBLrDHbKDoMC9ffMxwHqvsrNzTFV',
      'WeBBm1LfKBH3V5rEL5DAHtjjDiAws3Z83m',
      'WWTNERwV3dcvWjCbR4rizMuEqPbFjZsd3C',
      'WR4EQB8wZUzsVnqhodBBbtYsvKxrr9puG7',
      'WjJZoqV3AbRfgBWNfjAyVYTydFuWNPgspW',
      'Wh2FHvahkwvt29saUz7jnhuDh3WDHuc2ZY',
      'Wg5bXXQpRE5DWwsGDNfHsKyisJPVotxhhS',
      'WiodAJyH67sSTGgpRPXWsVGEfGESN7ykEt',
      'WNpFPr1EDwBgtTqYUNTbKTRpbGj6vdNgdL',
      'WVPeyNm4pWjJJixjj1DsRc4ceYd75xCyxq',
      'WcZotwyy1FnFYuA8D2LqrUBSNEFcPr3T7a',
      'Wki6BdLTCzS4ZoQSY1QgfgzQdgT9R3txEb',
      'Wgk7UPN4zZZdMbsCNMSosRwsvHtMoWf8S6',
      'Wmqn3sanBexFaNk3nDtdb4SnHxB5MRzr7m',
      'Wbh9FrUF85FWUh7xgpqf9gjH7D2f3Py4kc',
      'WWGKeK7yJcKqvxMj2C8TFFJLooqq8Kc65z',
      'WRenJ9f6yqrYRzBUwqbBFAxAY7JzwryKut',
      'WQozCB8X2FFM9QtEMoPjo6xERVTkiBw8Mj',
      'Wds8d4vy691GwVDdzKrw1LpnvBR283VTci',
    ]
  },
  miner: {
    walletId: 'miner-wallet',
    words: 'scare more mobile text erupt flush paper snack despair goddess route solar keep search result author bounce pulp shine next butter unknown frozen trap',
    addresses: [
      'WTjhJXzQJETVx7BVXdyZmvk396DRRsubdw', // Miner rewards address
      'Wdf7xQtKDNefhd6KTS68Vna1u4wUAyHjLQ',
      'WaQf5igKpbdNyxTBzc3Nv8a8n4DRkcbpmX',
      'WYzcaxpK4x8XjZKkvcpb5CXKuEsfAsD3vD',
      'WjfMPKn7prjXUdzp7dFAxuDGreSTArnScE',
      'WVE1uwNor9Haitx2qGu9SB4uv4wVwGAWDP',
      'WbDaM4VGcWMBXPihJrViiYDphM7WoGDMWQ',
      'WgPiV4KvwaeKeRxj434ZjkvakX23hBhLyd',
      'We1t89h3YJuj9eU1SGfNwamk9FRBv3GhgD',
      'WeDLxQhv4vs4K8HVy4FUPBWSsN49rNYGKd',
      'WetZFhUkFqfv73k7AzcQm95vnRHCRzH7vQ',
      'WNgP5CEqhW4yMLjARi7JVMh9iapnUcTQtG',
      'WUr1RDAZVLY7w6M5M416uXLxpFekcXz1WH',
      'WexLCpMTBdgAbhH8Br2sCn6SPu44CZWSpK',
      'WWUdwEecrcFTdaFz1ZkeL1ZzyRg4YsvnY7',
      'WmpwqZg1KCQvBMxaE6BLgFrSv2AZS1FCw5',
      'WfiWuwxqcJMPSfjpDhqtRfW3sDg78hg34y',
      'Wh781JkXsumkTZKMKZmV4BjV8Nnjevkxkk',
      'Wb6792ceTDSJdySvQm7tikrNva4FRuVsUX',
      'WYZigDNfJ6x5T7VfVrgd1CtkKGfoBRRbyr',
      'WWGWrrUqpbP4ekx4zoNtBsrhCSEspxpDyA',
      'WgWfrJqAgS3RwzXMMz8fywidQAUx6a5smc'
    ]
  },
  ocb: {
    seed: 'bicycle dice amused car lock outdoor auto during nest accident soon sauce slot enact hand they member source job forward vibrant lab catch coach', // The wallet that can sign on chain blueprint txs with its address at index 0
  },
};

export const TOKEN_DATA = {
  HTR: 0,
  TOKEN: 1,

  /**
   * Checks if this token_data indicates this is an authority output, that is, if its 8th bit from
   * the right is 1.
   * @see https://github.com/HathorNetwork/rfcs/blob/master/text/0004-tokens.md#token_data-field
   * @param {number} tokenData "token_data" property from an output
   * @returns {boolean} True if this is an authority output
   */
  isAuthorityToken: tokenData => transactionUtils.isAuthorityOutput({ token_data: tokenData }),
};

export const AUTHORITY_VALUE = {
  MINT: libConstants.TOKEN_MINT_MASK,
  MELT: libConstants.TOKEN_MELT_MASK
};

export const HATHOR_TOKEN_ID = libConstants.NATIVE_TOKEN_UID;
