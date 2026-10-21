AWS CloudFront URL Signature Utility
===================
[![CI](https://github.com/jasonsims/aws-cloudfront-sign/actions/workflows/ci.yml/badge.svg)](https://github.com/jasonsims/aws-cloudfront-sign/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/aws-cloudfront-sign)](https://www.npmjs.com/package/aws-cloudfront-sign)

---

**NOTE**

The [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) also generates CloudFront signed URLs and cookies via [`@aws-sdk/cloudfront-signer`](https://www.npmjs.com/package/@aws-sdk/cloudfront-signer). If you already use the AWS SDK, that is a fine choice. This package is a lightweight alternative: zero runtime dependencies and a small API covering signed URLs and signed cookies (returned as a plain object you can set directly on a response).

---

A small utility for generating [signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html) and [signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html) (canned policy) for private CloudFront content.

## Usage
### Requirements
* Node.js >=18
* Active CloudFront distribution with origin configured

### Configuring CloudFront
1. Generate an RSA key pair. Keep the private key secret; only the public key is uploaded to AWS.
   ```sh
   openssl genrsa -out private_key.pem 2048
   openssl rsa -pubout -in private_key.pem -out public_key.pem
   ```
2. In the CloudFront console, upload `public_key.pem` as a **public key** and add it to a **key group**.
   Note the public key's **ID** (e.g. `K2JCJMDEHXQW5F`): this is the `keypairId` option.
3. In your distribution's cache behavior, enable **Restrict viewer access** and select
   **Trusted key groups**, choosing the key group from step 2. [more info][cf_trusted_signers_docs]
4. If your origin is an S3 bucket, keep the bucket private and use
   **Origin Access Control (OAC)** so only CloudFront can read from it. [more info][cf_oac_docs]

AWS recommends trusted key groups over legacy CloudFront key pairs, which require the AWS
account root user to manage. Legacy key pair IDs still work with this package.

### Installing
```sh
npm install aws-cloudfront-sign
```

### TypeScript
Type definitions are included, and the public types are exported from the package entry:
```ts
import { getSignedUrl } from 'aws-cloudfront-sign';
import type { SignatureOptions } from 'aws-cloudfront-sign';

const options: SignatureOptions = {
  keypairId: 'K2JCJMDEHXQW5F',
  privateKeyPath: '/path/to/private_key.pem',
};
const signedUrl = getSignedUrl('https://d111111abcdef8.cloudfront.net/path/to/object', options);
```

### Upgrading from 3.0 to 3.1
There are no breaking changes.
* ES Modules now work: `import { getSignedUrl } from 'aws-cloudfront-sign'` loads a native ESM
  build (the ESM build in 3.0.x was not reachable). `import cf from 'aws-cloudfront-sign'` also
  works. CommonJS (`require`) is unchanged.
* Public types (`SignatureOptions`, `ExpireTime`) are exported from the package entry;
  `aws-cloudfront-sign/types` works too.
* The `expireTime` type now matches what the runtime accepts (see [options](#options)).
* New `privateKeyPassphrase` option for encrypted private keys.

### Upgrading from 2.x to 3.x
* There shouldn't be any breaking changes when coming to 3.x. RTMP URLs were deprecated by Amazon
but that will affect all versions.
* Support for ES Modules was added
* Support for TypeScript was added

### Upgrading from 1.x to 2.x
* `expireTime` now takes its value as milliseconds, Date, or
 [moment][moment_docs] instead of seconds.

### API
#### getSignedUrl(url, options)
* `@param {String} url` - CloudFront URL to sign
* `@param {Object} options` - URL signature [options](#options)
* `@return {String} signedUrl` - Signed CloudFront URL

#### getSignedCookies(url, options)
* `@param {String} url` - CloudFront URL to sign
* `@param {Object} options` - URL signature [options](#options)
* `@return {Object} cookies` - Signed AWS cookies

#### ~~getSignedRTMPUrl(domainName, s3key, options)~~
⛔️ **Deprecated**: [RTMP Support Discontinuing on December 31, 2020](https://repost.aws/questions/QUoUZgHZh7SEWlnQUPlBmVNQ/announcement-rtmp-support-discontinuing-on-december-31-2020)
* ~~`@param {String} domainName` - Domain name of your Cloudfront distribution~~
* ~~`@param {String} s3key` - Path to s3 object~~
* ~~`@param {Object} options` - URL signature [options](#options)~~
* ~~`@return {Object} url.rtmpServerPath` - RTMP formatted server path~~
* ~~`@return {Object} url.rtmpStreamName` - Signed RTMP formatted stream name~~

### Options
* `keypairId` - The ID of the CloudFront public key in your trusted key group
  (or, for legacy setups, the access key ID of a CloudFront key pair).
* `privateKeyString` || `privateKeyPath` - The private key matching that public
  key, provided either as a PEM string or as a path to the `.pem` file.
  If both are given, `privateKeyPath` is used.
  **Note:** When providing the private key as a string, it must include its
  line breaks. Loading it from a file or an environment variable is easiest:

  ```js
  const privateKeyString = process.env.CF_PRIVATE_KEY;
  // or
  const privateKeyString = fs.readFileSync('private_key.pem', 'utf8');
  // or inline, using a template literal (avoid committing real keys)
  const privateKeyString = `-----BEGIN PRIVATE KEY-----
  ...base64-encoded key data...
  -----END PRIVATE KEY-----`;
  ```
  Storing the key in an environment variable:
  ```sh
  # Local env example
  export CF_PRIVATE_KEY="$(cat private_key.pem)"

  # Heroku env
  heroku config:set CF_PRIVATE_KEY="$(cat private_key.pem)"
  ```
* `privateKeyPassphrase` (**Optional**) - Passphrase for an encrypted private key.
* `expireTime` (**Optional** - Default: 30 minutes from now) - The point in time
  when the URL or cookies expire. Accepted values are:
   * Date - JavaScript Date object (`new Date(Date.now() + 60 * 60 * 1000)`)
   * number - Unix timestamp in **milliseconds** (`Date.now() + 1800000`)
   * string - Numeric string of milliseconds (`'1767225600000'`)
   * Any object whose `valueOf()` returns milliseconds, e.g.
     [Day.js](https://day.js.org/) (`dayjs().add(1, 'day')`) or
     [moment][moment_docs] (`moment().add(1, 'day')`)
* `ipRange` (**Optional**) - IP address range allowed to make GET requests
  for your signed URL. This value must be given in standard IPv4 CIDR format
  (for example, 10.52.176.0/24).

## Examples
### Creating a signed URL
By default the URL will expire after half an hour.
```js
// ESM
import { getSignedUrl } from 'aws-cloudfront-sign';
// CommonJS
// const { getSignedUrl } = require('aws-cloudfront-sign');

const options = {
  keypairId: 'K2JCJMDEHXQW5F',
  privateKeyPath: '/path/to/private_key.pem',
  expireTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
};
const signedUrl = getSignedUrl('https://d111111abcdef8.cloudfront.net/path/to/object', options);
console.log(`Signed URL: ${signedUrl}`);
```

### Creating signed cookies
```js
// ESM
import { getSignedCookies } from 'aws-cloudfront-sign';
// CommonJS
// const { getSignedCookies } = require('aws-cloudfront-sign');

const options = {
  keypairId: 'K2JCJMDEHXQW5F',
  privateKeyString: process.env.CF_PRIVATE_KEY,
};
const signedCookies = getSignedCookies('https://d111111abcdef8.cloudfront.net/*', options);

// Set the cookies on your response, e.g. with Express:
for (const [name, value] of Object.entries(signedCookies)) {
  res.cookie(name, value);
}
```

More runnable examples are in [examples/](examples/).

[moment_docs]: https://momentjs.com/docs/
[cf_trusted_signers_docs]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html
[cf_oac_docs]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
