// CommonJS half of the packed-tarball smoke test (see scripts/smoke-test.mjs).
//
// smoke-test.mjs copies this file into a throwaway consumer project and runs it
// there, so `require('aws-cloudfront-sign')` resolves to the installed tarball.
// It also exports `checkSignedUrl`, which the ESM half reuses.
'use strict';

const assert = require('node:assert/strict');
const { generateKeyPairSync, verify } = require('node:crypto');

// Undo the library's CloudFront-safe base64 encoding.
const denormalize = (str) =>
  str.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/');

// Sign a URL with a throwaway RSA key and verify the result with the public key.
function checkSignedUrl(label, getSignedUrl) {
  assert.equal(
    typeof getSignedUrl,
    'function',
    `${label}: getSignedUrl is not a function`,
  );

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  const resource = 'https://d111111abcdef8.cloudfront.net/smoke/test.txt';
  const signed = getSignedUrl(resource, {
    keypairId: 'K2JCJMDEHXQW5F',
    privateKeyString: privateKey,
    expireTime: Date.now() + 60 * 60 * 1000,
  });

  const url = new URL(signed);
  assert.equal(
    `${url.origin}${url.pathname}`,
    resource,
    `${label}: unexpected base URL`,
  );
  for (const param of ['Expires', 'Policy', 'Signature', 'Key-Pair-Id']) {
    assert.ok(
      url.searchParams.get(param),
      `${label}: missing ${param} query param`,
    );
  }
  assert.equal(url.searchParams.get('Key-Pair-Id'), 'K2JCJMDEHXQW5F');

  const policy = Buffer.from(
    denormalize(url.searchParams.get('Policy')),
    'base64',
  ).toString('utf8');
  assert.equal(
    JSON.parse(policy).Statement[0].Resource,
    resource,
    `${label}: policy resource mismatch`,
  );

  const signature = Buffer.from(
    denormalize(url.searchParams.get('Signature')),
    'base64',
  );
  const valid = verify('RSA-SHA1', Buffer.from(policy), publicKey, signature);
  assert.ok(
    valid,
    `${label}: signature does not verify against the public key`,
  );

  console.log(`ok - ${label}: signed URL verified (${signed.slice(0, 80)}...)`);
}

module.exports = { checkSignedUrl };

if (require.main === module) {
  const cf = require('aws-cloudfront-sign');
  console.log(
    `require() resolved to ${require.resolve('aws-cloudfront-sign')}`,
  );
  checkSignedUrl('require', cf.getSignedUrl);
}
