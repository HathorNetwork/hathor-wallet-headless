import TestUtils from './test-utils';

describe('configuration string', () => {
  it('should return 400 without a token parameter', async () => {
    const response = await TestUtils.request
      .get('/configuration-string')
    expect(response.status).toBe(400);
  });

  it('should return 200 with token in parameter', async () => {
    const response = await TestUtils.request
      .get('/configuration-string')
      .query({ token: '1234' })
    expect(response.status).toBe(200);
  });
});