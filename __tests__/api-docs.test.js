import settingsFixture from './__fixtures__/settings-fixture';
import { getApiDocs } from '../src/api-docs';

const config = settingsFixture._getDefaultConfig();
jest.doMock('../src/config', () => ({
  __esModule: true,
  default: config,
}));

describe('api-docs', () => {
  const settings = jest.requireActual('../src/settings');

  beforeAll(async () => {
    await settings.setupConfig();
  });

  it('should return the components without any apikey by default', async () => {
    const apiDocs = getApiDocs();
    expect(apiDocs.components).not.toHaveProperty('ApiKeyAuth');
  });

  it('should return the components with the apikey if configured', async () => {
    const newConfig = settingsFixture._getDefaultConfig();
    newConfig.http_api_key = 'SAMPLE-TEST-KEY';
    settingsFixture._setConfig(newConfig);
    await settings.reloadConfig();

    const apiDocs = getApiDocs();
    expect(apiDocs.components).toHaveProperty('securitySchemes');
    expect(apiDocs.components.securitySchemes).toHaveProperty('ApiKeyAuth');
  });
});
