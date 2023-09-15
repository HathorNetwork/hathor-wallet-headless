import errors from '../src/errors';
import settingsFixture from './__fixtures__/settings-fixture';
import TestUtils from './test-utils';

test('wallet lib settings', async () => {
  const settings = jest.requireActual('../src/settings');
  expect(settings.getConfig).toThrow(errors.UnavailableConfigError);

  const config = settingsFixture._getDefaultConfig();

  jest.doMock('../src/config', () => ({
    __esModule: true,
    default: config,
  }));

  await settings.setupConfig();
  await expect(settings.setupConfig()).rejects.toThrow('Cannot setup the configuration twice');

  expect(settings.getConfig).not.toThrow();

  const newConfig = settingsFixture._getDefaultConfig();
  newConfig.multisig = TestUtils.multisigData;

  await expect(settings.reloadConfig()).resolves.not.toThrow();

  jest.dontMock('../src/config');
});
