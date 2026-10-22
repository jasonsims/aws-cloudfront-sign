// Consumer-level integration suite for aws-cloudfront-sign.
//
// Runs inside a throwaway project that has only the packed tarball installed
// (see scripts/integration-test.mjs), against the public API exactly as npm
// users get it. Expected values come from an independent reference
// implementation of CloudFront's canned-policy signing (below), and RSA
// PKCS#1 v1.5 signatures are deterministic, so any two versions that pass this
// suite produce byte-identical signed URLs and cookies.
//
// Only uses Node built-ins available in Node 18 (the oldest supported engine).
'use strict';

const assert = require('node:assert/strict');
const { createPublicKey, createSign, verify } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { describe, it } = require('node:test');

const PRIVATE_KEY_PATH = join(__dirname, 'dummy.pem');
const PRIVATE_KEY = readFileSync(PRIVATE_KEY_PATH, 'utf8');
const PUBLIC_KEY = createPublicKey(PRIVATE_KEY);

const KEYPAIR_ID = 'K2JCJMDEHXQW5F';
const RESOURCE = 'https://d111111abcdef8.cloudfront.net/private/video.mp4';
// Fixed expiry so signatures are deterministic. Must stay in the future:
// move it forward before 2030.
const EXPIRE_MS = Date.UTC(2030, 0, 1);
const EXPIRE_SECS = EXPIRE_MS / 1000;

// --- Reference implementation (per the CloudFront developer guide) ---------

// CloudFront's URL-safe base64: '+' -> '-', '=' -> '_', '/' -> '~'.
const toCfBase64 = (buf) =>
  buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

const fromCfBase64 = (str) =>
  Buffer.from(
    str.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/'),
    'base64',
  );

function expectedPolicy(resource, expireSecs, ipRange) {
  const condition = { DateLessThan: { 'AWS:EpochTime': expireSecs } };
  if (ipRange) {
    condition.IpAddress = { 'AWS:SourceIp': ipRange };
  }
  return JSON.stringify({
    Statement: [{ Resource: resource, Condition: condition }],
  });
}

function expectedParams(resource, expireSecs, ipRange) {
  const policy = expectedPolicy(resource, expireSecs, ipRange);
  const signature = createSign('RSA-SHA1').update(policy).sign(PRIVATE_KEY);
  return {
    policy,
    Policy: toCfBase64(Buffer.from(policy)),
    Signature: toCfBase64(signature),
  };
}

function expectedSignedUrl(resource, expireSecs, ipRange) {
  const { Policy, Signature } = expectedParams(resource, expireSecs, ipRange);
  const url = new URL(resource);
  url.searchParams.set('Expires', `${expireSecs}`);
  url.searchParams.set('Policy', Policy);
  url.searchParams.set('Signature', Signature);
  url.searchParams.set('Key-Pair-Id', KEYPAIR_ID);
  return url.toString();
}

// Verify a signed URL the way CloudFront would: the signature must match the
// policy carried in the URL, under the public key.
function assertVerifies(signedUrl) {
  const params = new URL(signedUrl).searchParams;
  const policy = fromCfBase64(params.get('Policy'));
  const signature = fromCfBase64(params.get('Signature'));
  assert.ok(
    verify('RSA-SHA1', policy, PUBLIC_KEY, signature),
    'signature does not verify against the public key',
  );
  return JSON.parse(policy.toString('utf8'));
}

const baseOptions = (overrides) =>
  Object.assign(
    {
      keypairId: KEYPAIR_ID,
      privateKeyString: PRIVATE_KEY,
      expireTime: EXPIRE_MS,
    },
    overrides,
  );

// --- Suite -----------------------------------------------------------------

/**
 * Register the suite for one way of loading the package.
 *
 * @param {string} label How the API was loaded, e.g. "require".
 * @param {object} api The loaded module (getSignedUrl, getSignedCookies, ...).
 */
function defineSuite(label, api) {
  describe(`aws-cloudfront-sign via ${label}`, () => {
    it('exposes the public API', () => {
      assert.equal(typeof api.getSignedUrl, 'function');
      assert.equal(typeof api.getSignedCookies, 'function');
      assert.equal(typeof api.getSignedRTMPUrl, 'function');
      assert.ok(api.CannedPolicy, 'CannedPolicy export is missing');
    });

    describe('getSignedUrl', () => {
      it('matches the reference signed URL and verifies', () => {
        const signed = api.getSignedUrl(RESOURCE, baseOptions());

        assert.equal(signed, expectedSignedUrl(RESOURCE, EXPIRE_SECS));
        const policy = assertVerifies(signed);
        assert.equal(policy.Statement[0].Resource, RESOURCE);
      });

      it('appends params in CloudFront order with URL-safe values', () => {
        const params = new URL(api.getSignedUrl(RESOURCE, baseOptions()))
          .searchParams;

        assert.deepEqual(
          [...params.keys()],
          ['Expires', 'Policy', 'Signature', 'Key-Pair-Id'],
        );
        assert.equal(params.get('Expires'), `${EXPIRE_SECS}`);
        assert.equal(params.get('Key-Pair-Id'), KEYPAIR_ID);
        assert.doesNotMatch(params.get('Policy'), /[+=/]/);
        assert.doesNotMatch(params.get('Signature'), /[+=/]/);
      });

      it('gives the same result for every expireTime input type', () => {
        const expected = expectedSignedUrl(RESOURCE, EXPIRE_SECS);
        const inputs = {
          number: EXPIRE_MS,
          Date: new Date(EXPIRE_MS),
          'numeric string': `${EXPIRE_MS}`,
          'valueOf() object (moment/dayjs)': { valueOf: () => EXPIRE_MS },
        };

        for (const [kind, expireTime] of Object.entries(inputs)) {
          assert.equal(
            api.getSignedUrl(RESOURCE, baseOptions({ expireTime })),
            expected,
            `expireTime as ${kind}`,
          );
        }
      });

      it('reads the private key from privateKeyPath', () => {
        const signed = api.getSignedUrl(
          RESOURCE,
          baseOptions({
            privateKeyString: undefined,
            privateKeyPath: PRIVATE_KEY_PATH,
          }),
        );

        assert.equal(signed, expectedSignedUrl(RESOURCE, EXPIRE_SECS));
      });

      it('adds an IP restriction to the signed policy', () => {
        const ipRange = '192.0.2.0/24';
        const signed = api.getSignedUrl(RESOURCE, baseOptions({ ipRange }));

        assert.equal(signed, expectedSignedUrl(RESOURCE, EXPIRE_SECS, ipRange));
        const policy = assertVerifies(signed);
        assert.equal(
          policy.Statement[0].Condition.IpAddress['AWS:SourceIp'],
          ipRange,
        );
      });

      it('keeps existing query params and signs the full URL', () => {
        const resource = `${RESOURCE}?response-content-type=video%2Fmp4&v=2`;
        const signed = api.getSignedUrl(resource, baseOptions());
        const params = new URL(signed).searchParams;

        assert.equal(signed, expectedSignedUrl(resource, EXPIRE_SECS));
        assert.equal(params.get('response-content-type'), 'video/mp4');
        assert.equal(params.get('v'), '2');
        assert.equal(assertVerifies(signed).Statement[0].Resource, resource);
      });

      it('defaults expireTime to 30 minutes from now', () => {
        const before = Math.round(Date.now() / 1000);
        const signed = api.getSignedUrl(
          RESOURCE,
          baseOptions({ expireTime: undefined }),
        );
        const after = Math.round(Date.now() / 1000);
        const expires = Number(new URL(signed).searchParams.get('Expires'));

        assert.ok(
          expires >= before + 1800 && expires <= after + 1800,
          `Expires ${expires} is not ~30 minutes after ${before}`,
        );
        assertVerifies(signed);
      });
    });

    describe('getSignedCookies', () => {
      it('returns the reference cookie values', () => {
        const { Policy, Signature } = expectedParams(RESOURCE, EXPIRE_SECS);

        assert.deepEqual(api.getSignedCookies(RESOURCE, baseOptions()), {
          'CloudFront-Policy': Policy,
          'CloudFront-Signature': Signature,
          'CloudFront-Key-Pair-Id': KEYPAIR_ID,
        });
      });

      it('supports wildcard resources and IP restrictions', () => {
        const resource = 'https://d111111abcdef8.cloudfront.net/private/*';
        const ipRange = '198.51.100.7/32';
        const cookies = api.getSignedCookies(
          resource,
          baseOptions({ ipRange }),
        );
        const { Policy, Signature } = expectedParams(
          resource,
          EXPIRE_SECS,
          ipRange,
        );

        assert.equal(cookies['CloudFront-Policy'], Policy);
        assert.equal(cookies['CloudFront-Signature'], Signature);
      });
    });

    describe('errors', () => {
      it('rejects a private key without line breaks', () => {
        assert.throws(
          () =>
            api.getSignedUrl(
              RESOURCE,
              baseOptions({ privateKeyString: PRIVATE_KEY.replace(/\n/g, '') }),
            ),
          /line breaks/,
        );
      });

      it('rejects a missing private key', () => {
        assert.throws(() =>
          api.getSignedUrl(RESOURCE, { keypairId: KEYPAIR_ID }),
        );
      });

      it('rejects an expireTime in the past', () => {
        assert.throws(
          () =>
            api.getSignedUrl(
              RESOURCE,
              baseOptions({ expireTime: Date.now() - 60000 }),
            ),
          /after the current time/,
        );
      });

      it('rejects an expireTime past January 19, 2038', () => {
        assert.throws(
          () =>
            api.getSignedUrl(
              RESOURCE,
              baseOptions({ expireTime: Date.UTC(2038, 1, 1) }),
            ),
          /2038/,
        );
      });

      it('reports that RTMP is no longer supported', () => {
        assert.throws(() => api.getSignedRTMPUrl(), /RTMP/);
      });
    });
  });
}

/**
 * Checks on the installed package itself (independent of how it is loaded).
 *
 * @param {string} pkgJsonPath Resolved path of the installed package.json.
 */
function definePackageSuite(pkgJsonPath) {
  describe('installed package', () => {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const root = dirname(pkgJsonPath);

    it('has no runtime dependencies', () => {
      assert.deepEqual(Object.keys(pkg.dependencies || {}), []);
      assert.deepEqual(Object.keys(pkg.peerDependencies || {}), []);
    });

    it('ships its main entry, type declarations, README and LICENSE', () => {
      const types =
        pkg.types || pkg.typings || pkg.main.replace(/\.js$/, '.d.ts');
      for (const file of [pkg.main, types, 'README.md', 'LICENSE']) {
        assert.ok(
          existsSync(join(root, file)),
          `${file} is not in the package`,
        );
      }
    });

    it('does not ship sources, tests or tooling', () => {
      for (const file of [
        'src',
        'test',
        'scripts',
        '.github',
        'node_modules',
      ]) {
        assert.ok(
          !existsSync(join(root, file)),
          `${file} should not be published`,
        );
      }
    });
  });
}

module.exports = { defineSuite, definePackageSuite };
