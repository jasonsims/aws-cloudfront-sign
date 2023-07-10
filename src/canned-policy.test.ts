import { describe, it, expect } from '@jest/globals';
import CannedPolicy from './canned-policy';
import { AwsPolicy } from './types';

describe('CannedPolicy', function () {
  it('should convert `expireTime` to seconds', () => {
    const expireTimeMs = new Date().getTime();
    const expireTimeSecs = Math.round(expireTimeMs / 1000);
    const policy = new CannedPolicy('http://t.com', expireTimeMs);

    expect(policy.expireTime).toBe(expireTimeSecs);
  });

  describe('.toJSON()', function () {
    it('should fail if `url` is missing', () => {
      const expireTimeMs = new Date().getTime();
      const policy = new CannedPolicy(undefined, expireTimeMs);
      const func = () => policy.toJSON();

      expect(func).toThrow(/missing param: url/i);
    });
    it('should fail if `expireTime` is missing', () => {
      const policy = new CannedPolicy('test', undefined);
      const func = () => policy.toJSON();

      expect(func).toThrow(/missing param: expireTime/i);
    });
    it('should fail if `expireTime` is after the end of time', () => {
      const policy = new CannedPolicy('test', 3000000000000);
      const func = () => policy.toJSON();

      expect(func).toThrow(/expireTime must be less than.*/i);
    });
    it('should fail if `expireTime` is before now', () => {
      const beforeNow = new Date().getTime() - 10000;
      const policy = new CannedPolicy('test', beforeNow);
      const func = () => policy.toJSON();

      expect(func).toThrow(/.*must be after the current time$/i);
    });
    it('should support IP restrictions', () => {
      const expireTimeMs = new Date().getTime() + 10000;
      const policy = new CannedPolicy('http://t.com', expireTimeMs, '1.2.3.0/24');
      const result = policy.toJSON();
      // Parse the stringified result so we can examine it's properties.
      const parsedResult = JSON.parse(result) as AwsPolicy;

      expect(parsedResult).toHaveProperty('Statement[0].Condition.IpAddress.AWS:SourceIp', '1.2.3.0/24');
    });
    it('should exclude IP restrictions if none were given', () => {
      const policy = new CannedPolicy('http://t.com', Date.now() + 1000);
      const result = policy.toJSON();
      // Parse the stringified result so we can examine it's properties.
      const parsedResult = JSON.parse(result) as AwsPolicy;

      expect(parsedResult).not.toHaveProperty('Statement[0].Condition.IpAddress.AWS:SourceIp');
    });
    it('should return the canned policy as stringified JSON', () => {
      const expireTimeMs = new Date().getTime() + 10000;
      const expireTimeSecs = Math.round(expireTimeMs / 1000);
      const policy = new CannedPolicy('http://t.com', expireTimeMs);
      const result = policy.toJSON();
      // Parse the stringified result so we can examine it's properties.
      const parsedResult = JSON.parse(result) as AwsPolicy;

      expect(parsedResult).toHaveProperty('Statement[0].Resource', 'http://t.com');
      expect(parsedResult).toHaveProperty('Statement[0].Condition.DateLessThan.AWS:EpochTime', expireTimeSecs);
    });
  });
});
