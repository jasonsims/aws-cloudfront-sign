import { describe, it, expect } from '@jest/globals';
import { normalizeBase64 } from './utils';

describe('utils', () => {
  describe('normalizeBase64()', () => {
    it('should translate illegal characters', () => {
      const illegalChars = ['+', '=', '/'];
      const arg = illegalChars.join('');
      const sig = normalizeBase64(arg);

      expect(sig).toBe('-_~');
    });

    it('should not alter valid characters', () => {
      const sig = normalizeBase64('test+str');

      expect(sig).toBe('test-str');
    });
  });
});
