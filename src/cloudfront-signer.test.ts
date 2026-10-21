import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  expect,
  vi,
} from 'vitest';

import { URL } from 'url';
import { cwd } from 'process';
import { join } from 'path';
import { readFileSync } from 'fs';
import { createPublicKey, generateKeyPairSync, verify } from 'crypto';
import moment from 'moment';

import { getSignedUrl, getSignedCookies } from './cloudfront-signer';
import { SignatureOptions, AwsPolicy } from './types';

// Reverse `normalizeBase64` and decode to raw bytes.
function denormalizeBase64(str: string): Buffer {
  const safeBase64Chars = { '+': '-', '=': '_', '/': '~' };

  Object.entries(safeBase64Chars).forEach(([actualChar, safeChar]) => {
    const re = new RegExp('\\' + safeChar, 'g');
    str = str.replace(re, actualChar);
  });

  return Buffer.from(str, 'base64');
}

function deserializePolicy(policy: string): AwsPolicy {
  return JSON.parse(denormalizeBase64(policy).toString('ascii')) as AwsPolicy;
}

// Cryptographically verify a normalized CloudFront signature over a
// normalized policy using the given public key.
function verifySignature(
  policy: string,
  signature: string,
  publicKey: Parameters<typeof verify>[2],
): boolean {
  return verify(
    'RSA-SHA1',
    denormalizeBase64(policy),
    publicKey,
    denormalizeBase64(signature),
  );
}

describe('CloudfrontUtil', function () {
  let defaultParams: SignatureOptions;
  let pkey: Buffer;
  let pkeyPath: string;

  // Freeze time so expiry values are deterministic.
  const now = new Date('2024-01-01T00:00:00Z');
  const nowSecs = now.getTime() / 1000;

  // Setup
  // ------
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    pkeyPath = './test/files/dummy.pem';
    pkey = readFileSync(join(cwd(), pkeyPath));
    defaultParams = {
      keypairId: 'ABC123',
      privateKeyString: pkey.toString('ascii'),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Tests
  // ------
  describe('getSignedUrl', function () {
    it('should accept `expireTime` as a string', () => {
      const testExpireTime = moment().add(1, 'day').unix() * 1000;
      const params: SignatureOptions = {
        ...defaultParams,
        expireTime: `${testExpireTime}`,
      };
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = (testExpireTime / 1000).toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept `expireTime` as a number', () => {
      const testExpireTime = moment().add(1, 'day').unix() * 1000;
      const params: SignatureOptions = {
        ...defaultParams,
        expireTime: testExpireTime,
      };
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = (testExpireTime / 1000).toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept `expireTime` as a moment', () => {
      const testExpireTime = moment().add(1, 'day');
      const params: SignatureOptions = {
        ...defaultParams,
        expireTime: testExpireTime,
      };
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = testExpireTime.unix().toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept `expireTime` as a Date', () => {
      const testExpireTime = new Date(new Date().getTime() + 10000);
      const params: SignatureOptions = {
        ...defaultParams,
        expireTime: testExpireTime,
      };
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);
      const expectedResult = Math.round(
        testExpireTime.getTime() / 1000,
      ).toString();

      expect(parsedResult.searchParams.get('Expires')).toBe(expectedResult);
    });

    it('should accept private key as string', () => {
      const params = Object.assign({}, defaultParams);
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);

      expect(parsedResult.searchParams.has('Signature')).toBe(true);
    });

    it('should produce a signature verifiable with the public key', () => {
      const result = getSignedUrl('http://foo.com', defaultParams);
      const parsedResult: URL = new URL(result);

      expect(
        verifySignature(
          parsedResult.searchParams.get('Policy'),
          parsedResult.searchParams.get('Signature'),
          createPublicKey(pkey),
        ),
      ).toBe(true);
    });

    it('should not accept non-numeric `expireTime` strings', () => {
      const params: SignatureOptions = {
        ...defaultParams,
        // @ts-expect-error date strings are not parsed; only numeric strings are accepted
        expireTime: '2030-01-01',
      };

      expect(params.expireTime).toBe('2030-01-01');
    });

    it('should fail with a clear error when no private key is given', () => {
      const params: SignatureOptions = { keypairId: 'ABC123' };

      expect(() => getSignedUrl('http://foo.com', params)).toThrow(
        /missing param: privateKeyString or privateKeyPath/i,
      );
    });

    it('should fail to accept single line private key as string', () => {
      const params = Object.assign({}, defaultParams, {
        privateKeyString: 'this_is_a_test_..._a_single_line_string',
      });

      expect(() => getSignedUrl('http://foo.com', params)).toThrow(
        /must include line breaks/,
      );
    });

    it('should accept private key as filepath', () => {
      const params = Object.assign({}, defaultParams, {
        privateKeyPath: join(cwd(), pkeyPath),
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

      expect(parsedResult.searchParams.get('Expires')).toBe(
        `${nowSecs + 1800}`,
      );
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

  describe('passphrase-protected private keys', function () {
    const passphrase = 'correct horse battery staple';
    let encryptedKey: string;
    let publicKey: string;

    beforeAll(() => {
      const keyPair = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase,
        },
      });
      encryptedKey = keyPair.privateKey;
      publicKey = keyPair.publicKey;
    });

    it('should sign a URL with the correct passphrase', () => {
      const params: SignatureOptions = {
        keypairId: 'ABC123',
        privateKeyString: encryptedKey,
        privateKeyPassphrase: passphrase,
      };
      const result = getSignedUrl('http://foo.com', params);
      const parsedResult: URL = new URL(result);

      expect(
        verifySignature(
          parsedResult.searchParams.get('Policy'),
          parsedResult.searchParams.get('Signature'),
          publicKey,
        ),
      ).toBe(true);
    });

    it('should sign cookies with the correct passphrase', () => {
      const result = getSignedCookies('http://foo.com', {
        keypairId: 'ABC123',
        privateKeyString: encryptedKey,
        privateKeyPassphrase: passphrase,
      });

      expect(
        verifySignature(
          result['CloudFront-Policy'],
          result['CloudFront-Signature'],
          publicKey,
        ),
      ).toBe(true);
    });

    it('should throw with a wrong passphrase', () => {
      expect(() =>
        getSignedUrl('http://foo.com', {
          keypairId: 'ABC123',
          privateKeyString: encryptedKey,
          privateKeyPassphrase: 'wrong passphrase',
        }),
      ).toThrow();
    });

    it('should throw when the passphrase is missing', () => {
      expect(() =>
        getSignedUrl('http://foo.com', {
          keypairId: 'ABC123',
          privateKeyString: encryptedKey,
        }),
      ).toThrow();
    });

    it('should still reject a single line encrypted key', () => {
      expect(() =>
        getSignedUrl('http://foo.com', {
          keypairId: 'ABC123',
          privateKeyString: encryptedKey.replace(/\r?\n/g, ''),
          privateKeyPassphrase: passphrase,
        }),
      ).toThrow(/must include line breaks/);
    });
  });

  describe('getSignedCookies', function () {
    it('should create cookies object', () => {
      const result = getSignedCookies('http://foo.com', defaultParams);

      expect(result).toHaveProperty('CloudFront-Policy');
      expect(result).toHaveProperty('CloudFront-Signature');
      expect(result).toHaveProperty('CloudFront-Key-Pair-Id', 'ABC123');

      const policy = deserializePolicy(result['CloudFront-Policy']);
      expect(policy.Statement[0].Resource).toBe('http://foo.com');
    });
  });
});
