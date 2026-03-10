/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getWalletConfigFromSeed } from '../../src/helpers/wallet.helper';
import { WalletStartError } from '../../src/errors';
import * as loggerModule from '../../src/logger';

const STUB_SEED = 'upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind';

describe('getWalletConfigFromSeed', () => {
  it('should return a wallet config for a valid seed', () => {
    const config = getWalletConfigFromSeed({ seed: STUB_SEED });
    expect(config).toHaveProperty('seed');
    expect(config).toHaveProperty('password');
    expect(config).toHaveProperty('pinCode');
  });

  it('should throw WalletStartError for an invalid seed', () => {
    expect(() => getWalletConfigFromSeed({ seed: 'invalid seed words' })).toThrow(WalletStartError);
  });

  it('should throw WalletStartError when passphrase is provided but not allowed', () => {
    const mockError = jest.fn();
    jest.spyOn(loggerModule, 'buildAppLogger').mockReturnValue({ error: mockError });

    expect(() => getWalletConfigFromSeed({
      seed: STUB_SEED,
      passphrase: 'my-passphrase',
      allowPassphrase: false,
    })).toThrow(WalletStartError);

    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('passphrase is not allowed')
    );
  });

  it('should set passphrase when allowed', () => {
    const config = getWalletConfigFromSeed({
      seed: STUB_SEED,
      passphrase: 'my-passphrase',
      allowPassphrase: true,
    });
    expect(config.passphrase).toBe('my-passphrase');
  });
});
