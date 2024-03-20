import { TestUtils } from './utils/test-utils-integration';

describe('configuration string', () => {
  // The success test is already done in the create token and create nft tests
  // after a token is created, then we get the configuration string and validate it
  // I won't replicate this test here because it would introduce more complexity in
  // the code here to inject funds to test something that is already being tested
  it('should return 400 without required token parameter', async () => {
    const response = await TestUtils.request
      .get('/configuration-string');

    expect(response.status).toBe(400);
  });

  it('should have an error with invalid token uid', async () => {
    // Using all the create token integration test context to test this invalid configuration
    // string request to prevent the need for creating a new file just for that
    const invalidConfigStringResponse = await TestUtils.getConfigurationString('1234');
    expect(invalidConfigStringResponse.success).toBe(false);
  });
});
