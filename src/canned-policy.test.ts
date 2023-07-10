import { describe, it } from '@jest/globals';

import CannedPolicy from './canned-policy';

describe('CannedPolicy', function () {
  it.todo('should convert `expireTime` to seconds');

  describe('.toJSON()', function () {
    it.todo('should fail if `url` is missing');
    it.todo('should fail if `expireTime` is missing');
    it.todo('should fail if `expireTime` is after the end of time');
    it.todo('should fail if `expireTime` is before now');
    it.todo('should support IP restrictions');
    it.todo('should exclude IP restrictions if none were given');
    it.todo('should return the canned policy as stringified JSON');
  });
});
