/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { constants } from '@hathor/wallet-lib';
import { getWalletBalanceForTx } from '../src/helpers/notification.helper';
import TestUtils from './test-utils';

describe('Notification helper', () => {
  const fakeToken = 'f6083ce2d9a7df94945044d100fb9912028d968d056ec89bec274e0b7a4c9567';
  const fakeTx1 = 'e13190dd230d504c382916084e9619012ed29022ad57a3ebf3da2ca97d29383b';
  const fakeTx2 = 'baa8604b907ddc7790171832527a734da76922ea0a167814df200455ca4f852c';
  const fakeTx3 = 'c3735dca4667905f3043c05cc1540a7a500c52aae2616fdae3597d83a55a5d04';
  const fakeTx4 = '042b04d947cbf01d603ecd86f46404751026c15abff9299702af3d64f36931a4';
  const fakeTxId = 'bca8fede24fefa9927e112eb93e22ce54c9fdf4f48ae89f09e7fc61e35dae84a';
  const fakeAddress = 'fake-address';

  const fakeTx = {
    tx_id: fakeTxId,
    version: 1,
    weight: 42.0,
    timestamp: 1662279685,
    is_voided: false,
    inputs: [
      {
        tx_id: fakeTx1,
        index: 0,
        token: '00',
        value: 30,
        token_data: 0,
        script: 'ZmFrZSBzY3JpcHQ=',
        decoded: {
          type: 'P2PKH',
          address: TestUtils.addresses[0],
          timelock: null,
        },
      },
      {
        tx_id: fakeTx2,
        index: 1,
        token: fakeToken,
        value: 15,
        token_data: 1,
        script: 'ZmFrZSBzY3JpcHQ=',
        decoded: {
          type: 'P2PKH',
          address: fakeAddress,
          timelock: null,
        },
      },
      {
        tx_id: fakeTx2,
        index: 2,
        token: fakeToken,
        value: 5,
        token_data: 1,
        script: 'ZmFrZSBzY3JpcHQ=',
        decoded: {
          type: 'P2PKH',
          address: TestUtils.addresses[1],
          timelock: null,
        },
      },
    ],
    outputs: [
      {
        value: 10,
        token_data: 0,
        script: 'ZmFrZSBzY3JpcHQ=',
        decoded: {
          type: 'P2PKH',
          address: TestUtils.addresses[1],
          timelock: null,
        },
        token: '00',
        spent_by: null,
        selected_as_input: false,
      },
      {
        value: 20,
        token_data: 0,
        script: 'ZmFrZSBzY3JpcHQ=',
        decoded: {
          type: 'P2PKH',
          address: fakeAddress,
          timelock: null,
        },
        token: '00',
        spent_by: null,
        selected_as_input: false,
      },
      {
        value: 20,
        token: fakeToken,
        token_data: 1,
        script: 'ZmFrZSBzY3JpcHQ=',
        decoded: {
          type: 'P2PKH',
          address: TestUtils.addresses[0],
          timelock: null,
        },
        spent_by: null,
        selected_as_input: true,
      },
    ],
    parents: [fakeTx3, fakeTx4]
  };

  it('should return empty for a transaction unrelated to the wallet', async () => {
    const fakeWallet = {
      isAddressMine: jest.fn().mockReturnValue(false),
    };
    const balance = await getWalletBalanceForTx(fakeWallet, fakeTx);
    expect(balance).toEqual({});
  });

  it('should return empty balance on all tokens for balanced transactions', async () => {
    // if isAddressMine is always true on this particular tx
    // the balance of tokens on inputs and outputs will be 0
    const fakeWallet = {
      isAddressMine: jest.fn().mockReturnValue(true),
    };
    const balance = await getWalletBalanceForTx(fakeWallet, fakeTx);
    expect(balance).toEqual({
      [constants.HATHOR_TOKEN_CONFIG.uid]: {
        tokens: { unlocked: 0, locked: 0 },
        authorities: { unlocked: { mint: 0, melt: 0 }, locked: { mint: 0, melt: 0 } },
      },
      [fakeToken]: {
        tokens: { unlocked: 0, locked: 0 },
        authorities: { unlocked: { mint: 0, melt: 0 }, locked: { mint: 0, melt: 0 } },
      },
    });
  });

  it('should return the balance of the wallet', async () => {
    const fakeWallet = {
      isAddressMine: jest.fn().mockImplementation(addr => addr !== fakeAddress),
    };
    const balance = await getWalletBalanceForTx(fakeWallet, fakeTx);
    expect(balance).toEqual({
      [constants.HATHOR_TOKEN_CONFIG.uid]: {
        tokens: { unlocked: -20, locked: 0 },
        authorities: { unlocked: { mint: 0, melt: 0 }, locked: { mint: 0, melt: 0 } },
      },
      [fakeToken]: {
        tokens: { unlocked: 15, locked: 0 },
        authorities: { unlocked: { mint: 0, melt: 0 }, locked: { mint: 0, melt: 0 } },
      },
    });
  });
});
