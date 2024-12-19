import { bigIntSanitizer } from '../src/schemas';

describe('test bigIntSanitizer', () => {
  it('should return expected value', () => {
    expect(bigIntSanitizer(null)).toStrictEqual(null);
    expect(bigIntSanitizer(undefined)).toStrictEqual(undefined);
    expect(bigIntSanitizer(123)).toStrictEqual(123n);
    expect(bigIntSanitizer(123n)).toStrictEqual(123n);
    expect(bigIntSanitizer(12345678901234567890n)).toStrictEqual(12345678901234567890n);
    expect(bigIntSanitizer('123')).toStrictEqual(123n);
    expect(bigIntSanitizer('12345678901234567890')).toStrictEqual(12345678901234567890n);

    expect(bigIntSanitizer('not a bigint')).toStrictEqual(undefined);
    expect(bigIntSanitizer(123.456)).toStrictEqual(undefined);
  });
});
