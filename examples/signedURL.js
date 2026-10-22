// Usage:
//   CF_KEYPAIR_ID=K2JCJMDEHXQW5F CF_PRIVATE_KEY="$(cat private_key.pem)" node examples/signedURL.js
// or point CF_PRIVATE_KEY_PATH at your .pem file instead of setting CF_PRIVATE_KEY.
const { getSignedUrl } = require('aws-cloudfront-sign');

// The ID of the public key in your CloudFront trusted key group.
const keypairId = process.env.CF_KEYPAIR_ID ?? 'K2JCJMDEHXQW5F';
const cfUrl = 'https://d111111abcdef8.cloudfront.net/path/to/object';

const signedUrl = getSignedUrl(cfUrl, {
  keypairId,
  expireTime: Date.now() + 60_000, // 1 minute
  privateKeyString: process.env.CF_PRIVATE_KEY,
  privateKeyPath: process.env.CF_PRIVATE_KEY_PATH,
});

console.log(signedUrl);
