// Usage:
//   CF_KEYPAIR_ID=K2JCJMDEHXQW5F CF_PRIVATE_KEY="$(cat private_key.pem)" node examples/signedURL.mjs
// or point CF_PRIVATE_KEY_PATH at your .pem file instead of setting CF_PRIVATE_KEY.
import { getSignedCookies, getSignedUrl } from 'aws-cloudfront-sign';

// The ID of the public key in your CloudFront trusted key group.
const keypairId = process.env.CF_KEYPAIR_ID ?? 'K2JCJMDEHXQW5F';
const options = {
  keypairId,
  expireTime: new Date(Date.now() + 60_000), // 1 minute
  privateKeyString: process.env.CF_PRIVATE_KEY,
  privateKeyPath: process.env.CF_PRIVATE_KEY_PATH,
};

const signedUrl = getSignedUrl(
  'https://d111111abcdef8.cloudfront.net/path/to/object',
  options,
);
console.log(signedUrl);

const signedCookies = getSignedCookies(
  'https://d111111abcdef8.cloudfront.net/*',
  options,
);
for (const [name, value] of Object.entries(signedCookies)) {
  console.log(`${name}=${value}`);
}
