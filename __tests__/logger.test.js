describe('buildAppLogger', () => {
  it('throws a descriptive error when called before config initialization', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      const { buildAppLogger } = require('../src/logger');

      expect(() => buildAppLogger()).toThrow(
        /buildLogger requires an initialized config/,
      );
    });
  });

  it('returns the cached logger on subsequent calls even when no config is passed', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      const { buildAppLogger } = require('../src/logger');

      const first = buildAppLogger({ consoleLevel: 'info' });
      const second = buildAppLogger();

      expect(second).toBe(first);
    });
  });
});
