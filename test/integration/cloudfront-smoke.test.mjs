// Smoke tests against a real CloudFront distribution.
//
// Skipped unless CF_URL, CF_KEYPAIR_ID and CF_PRIVATE_KEY are set (see
// .env.example). With CF_SMOKE=required (set in CI) missing values fail the
// run instead. Like the rest of this suite it runs against the installed
// tarball, so it proves AWS accepts what users will actually get.
//
// Only what the offline suite cannot prove is checked here. suite.cjs already
// shows that both builds, every expireTime form and every way of passing the
// key produce byte-identical output, so one of each is enough; checks that
// would only exercise AWS's own signature verification are left out.
//
// Requests are made over IPv4 so the `ipRange` checks are deterministic, and
// send a User-Agent: Node sends none, and the AWS managed WAF rules bundled
// with CloudFront flat-rate plans block requests without one.
import assert from 'node:assert/strict';
import { createPrivateKey } from 'node:crypto';
import { request } from 'node:https';
import { before, describe, it } from 'node:test';
import { getSignedCookies, getSignedUrl } from 'aws-cloudfront-sign';

const UA = 'aws-cloudfront-sign-integration-test';

const env = (name) => (process.env[name] || '').trim() || undefined;
const cfUrl = env('CF_URL');
const keypairId = env('CF_KEYPAIR_ID');
// The PEM itself, so CI can pass it straight from a secret. Accept it with
// real line breaks or as one line with literal \n escapes.
const rawKey = env('CF_PRIVATE_KEY');
const privateKey =
  rawKey && !rawKey.includes('\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

const missing = Object.entries({
  CF_URL: cfUrl,
  CF_KEYPAIR_ID: keypairId,
  CF_PRIVATE_KEY: privateKey,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);
const required = process.env.CF_SMOKE === 'required';
const skip =
  missing.length && !required
    ? `set ${missing.join(', ')} to run (see .env.example)`
    : false;

// CloudFront's own rejections are small XML documents; a WAF block is an HTML
// page and an S3 error says "Access Denied" with a RequestId. Matching the
// exact body proves a 403 came from signature/policy checking.
const MISSING_KEY = /<Error><Code>MissingKey<\/Code>/;
const POLICY_DENIED =
  /<Error><Code>AccessDenied<\/Code><Message>Access denied<\/Message><\/Error>/;

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: 'GET', family: 4, headers: { 'User-Agent': UA, ...headers } },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        );
      },
    );
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('request timed out')));
    req.end();
  });
}

const show = (res) =>
  `${res.status} (x-cache: ${res.headers['x-cache'] || '-'}) body: ` +
  res.body.replace(/\s+/g, ' ').slice(0, 300);

async function expectAccepted(url, headers) {
  const res = await get(url, headers);
  assert.equal(res.status, 200, `expected 200, got ${show(res)}`);
}

async function expectPolicyDenied(url) {
  const res = await get(url);
  assert.equal(res.status, 403, `expected 403, got ${show(res)}`);
  assert.match(
    res.body,
    POLICY_DENIED,
    `403 did not come from CloudFront's policy check: ${show(res)}`,
  );
}

const cookieHeader = (cookies) =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const options = (overrides) => ({
  keypairId,
  privateKeyString: privateKey,
  expireTime: Date.now() + 5 * 60_000,
  ...overrides,
});

describe('CloudFront smoke', { skip }, () => {
  // CloudFront's clock minus ours, from the Date header (1 s resolution).
  let skewMs = 0;

  before(async () => {
    assert.deepEqual(
      missing,
      [],
      `CF_SMOKE=required but ${missing.join(', ')} not set`,
    );
    try {
      createPrivateKey(privateKey);
    } catch (err) {
      assert.fail(
        `CF_PRIVATE_KEY is not a usable PEM private key (${err.message}). ` +
          'It needs its BEGIN/END lines and line breaks (or \\n escapes).',
      );
    }
    assert.equal(
      new URL(cfUrl).search,
      '',
      'CF_URL must not have a query string',
    );

    // Without this, every "rejected" check below would be meaningless.
    const res = await get(cfUrl);
    assert.ok(
      res.status === 403 && MISSING_KEY.test(res.body),
      `unsigned GET ${cfUrl} returned ${show(res)}; the cache behavior must ` +
        'restrict viewer access with a trusted key group',
    );
    skewMs = Date.parse(res.headers.date) - Date.now() || 0;
  });

  describe('accepted', () => {
    it('signed URL', () => expectAccepted(getSignedUrl(cfUrl, options())));

    it('URL that already has a query string', () => {
      const u = new URL(cfUrl);
      u.searchParams.set('smoke', 'a b+c/d');
      return expectAccepted(getSignedUrl(u.toString(), options()));
    });

    it('ipRange 0.0.0.0/0', () =>
      expectAccepted(getSignedUrl(cfUrl, options({ ipRange: '0.0.0.0/0' }))));

    it('signed cookies for origin/*', () => {
      const cookies = getSignedCookies(`${new URL(cfUrl).origin}/*`, options());
      return expectAccepted(cfUrl, { Cookie: cookieHeader(cookies) });
    });
  });

  describe('rejected', () => {
    // Proves the IpAddress condition is enforced, not silently ignored.
    it('ipRange that excludes us (192.0.2.0/24)', () =>
      expectPolicyDenied(
        getSignedUrl(cfUrl, options({ ipRange: '192.0.2.0/24' })),
      ));

    // Proves the policy's Resource is the URL that was signed.
    it('signature for a different path', () => {
      const signed = new URL(
        getSignedUrl(`${new URL(cfUrl).origin}/some/other/path`, options()),
      );
      const target = new URL(cfUrl);
      target.search = signed.search;
      return expectPolicyDenied(target.toString());
    });

    // Proves Expires is in seconds: a millisecond value would never expire.
    // Waits until the expiry has passed on CloudFront's clock, not ours.
    it('expired URL', async () => {
      const expireTime = Date.now() + 2_000;
      const url = getSignedUrl(cfUrl, options({ expireTime }));
      await sleep(Math.max(0, expireTime - (Date.now() + skewMs)) + 2_500);
      await expectPolicyDenied(url);
    });
  });
});
