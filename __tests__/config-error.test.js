import TestUtils from './test-utils';
import settings from '../src/settings';
import errors from '../src/errors';

const walletId = 'stub_config_error';

describe('config error middleware', () => {
  beforeAll(async () => {
    await TestUtils.startWallet({ walletId });
  });

  afterAll(async () => {
    await TestUtils.stopWallet({ walletId });
  });

  it('should return response and exit on non recoverable', async () => {
    const settingsMock = jest.spyOn(settings, 'reloadConfig').mockImplementation(async () => {
      throw new errors.NonRecoverableConfigChangeError();
    });
    const exitMock = jest.spyOn(process, 'exit').mockImplementation(jest.fn);

    const response = await TestUtils.request
      .post('/reload-config')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);

    expect(exitMock).toHaveBeenCalled();
    expect(settingsMock).toHaveBeenCalled();
    exitMock.mockRestore();
    settingsMock.mockRestore();
  });

  it('should return 503 on unavailable config', async () => {
    const settingsMock = jest.spyOn(settings, 'reloadConfig').mockImplementation(async () => {
      throw new errors.UnavailableConfigError();
    });

    const response = await TestUtils.request
      .post('/reload-config')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);

    expect(settingsMock).toHaveBeenCalled();
    settingsMock.mockRestore();
  });

  it('reload config success', async () => {
    const settingsMock = jest.spyOn(settings, 'reloadConfig');

    const response = await TestUtils.request
      .post('/reload-config')
      .set({ 'x-wallet-id': walletId });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(settingsMock).toHaveBeenCalled();
    settingsMock.mockRestore();
  });
});
