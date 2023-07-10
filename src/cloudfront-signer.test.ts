import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';

import { URL } from 'url';
import { cwd } from 'process';
import { join } from 'path';
import { readFileSync } from 'fs';
import moment from 'moment';
import { useFakeTimers, SinonFakeTimers } from 'sinon';

import { getSignedUrl, getSignedCookies } from './cloudfront-signer';
import { SignatureOptions, AwsPolicy } from './types';

function deserializePolicy (policy: string): AwsPolicy {
  const safeBase64Chars = { '+': '-', '=': '_', '/': '~' };

  Object.entries(safeBase64Chars).forEach(([actualChar, safeChar]) => {
    const re = new RegExp('\\' + safeChar, 'g');
    policy = policy.replace(re, actualChar);
  });

  return JSON.parse(Buffer.from(policy, 'base64').toString('ascii')) as AwsPolicy;
}

describe('CloudfrontUtil', function () {
  let defaultParams: SignatureOptions;
  let pkey;
  let pkeyPath: string;
  let clock: SinonFakeTimers;

  // Setup
  // ------
  beforeEach(() => {
    clock = useFakeTimers();
    pkeyPath = './test/files/dummy.pem';
    pkey = readFileSync(join(cwd(), pkeyPath));
    defaultParams = {
      keypairId: 'ABC123',
      privateKeyString: pkey.toString('ascii')
    };
  });

  afterEach(() => {
    clock.restore();
  });

  // Tests
  // ------
  describe('getSignedUrl', function () {
    it('should accept `expireTime` as a string', () => {
      const testExpireTime = moment().add(1, 'day').unix() * 1000;
      const params = Object.assign(defaultParams, {
        expireTime: testExpireTime.toString()
      });
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = (testExpireTime / 1000).toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept `expireTime` as a number', () => {
      const testExpireTime = moment().add(1, 'day').unix() * 1000;
      const params = Object.assign(defaultParams, {
        expireTime: testExpireTime
      });
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = (testExpireTime / 1000).toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept `expireTime` as a moment', () => {
      const testExpireTime = moment().add(1, 'day');
      const params = Object.assign(defaultParams, {
        expireTime: testExpireTime
      });
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = testExpireTime.unix().toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept `expireTime` as a Date', () => {
      const testExpireTime = new Date(new Date().getTime() + 10000);
      const params = Object.assign(defaultParams, {
        expireTime: testExpireTime
      });
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult =
        Math.round(testExpireTime.getTime() / 1000).toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept private key as string', () => {
      const params = Object.assign({}, defaultParams);
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);

      expect(parsedResult.searchParams.has('Signature')).toBe(true);
    });

    it('should fail to accept singe line private key as string', () => {
      const params = Object.assign({}, defaultParams);
      params.privateKeyString = 'this_is_a_test_..._a_single_line_string';

      expect(getSignedUrl.bind('http://foo.com', params)).toThrow(Error);
    });

    it('should accept private key as filepath', () => {
      const params = Object.assign({}, defaultParams, {
        privateKeyPath: join(cwd(), pkeyPath)
      });
      delete params.privateKeyString;

      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);

      expect(parsedResult.searchParams.has('Signature')).toBe(true);
    });

    it('should default `expireTime` to 30 minutes (1800 seconds)', () => {
      const params = Object.assign({}, defaultParams);
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);

      expect(parsedResult.searchParams.get('Expires')).toBe('1800');
    });

    it('should add base64-encoded `Policy` query param', () => {
      const params = Object.assign({}, defaultParams);
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const policy = deserializePolicy(parsedResult.searchParams.get('Policy'));

      expect(policy).toHaveProperty('Statement');
      expect(policy.Statement[0]).toHaveProperty('Resource');
      expect(policy.Statement[0].Resource).toBe('http://foo.com');
    });

    it('should include original query params', () => {
      const params = Object.assign({}, defaultParams);
      const result = getSignedUrl('http://foo.com?test=true', params);
      const parsedResult: URL = new URL(result);

      expect(parsedResult.searchParams.has('test')).toBe(true);
      expect(parsedResult.searchParams.has('Expires')).toBe(true);
      expect(parsedResult.searchParams.has('Signature')).toBe(true);
      expect(parsedResult.searchParams.has('Key-Pair-Id')).toBe(true);
      expect(parsedResult.searchParams.has('Policy')).toBe(true);
    });

    it('should return a signed URL', () => {
      const params = Object.assign({}, defaultParams);
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);

      expect(parsedResult.searchParams.has('Expires')).toBe(true);
      expect(parsedResult.searchParams.has('Signature')).toBe(true);
      expect(parsedResult.searchParams.has('Key-Pair-Id')).toBe(true);
      expect(parsedResult.searchParams.has('Policy')).toBe(true);
    });
  });

  describe('getSignedCookies', function () {
    it('should create cookies object', () => {
      const result = getSignedCookies('http://foo.com', defaultParams);

      expect(result).toHaveProperty('CloudFront-Policy');
      expect(result).toHaveProperty('CloudFront-Signature');
      expect(result).toHaveProperty('CloudFront-Key-Pair-Id');
    });
  });
});
