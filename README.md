AWS CloudFront URL Signature Utility
===================
[![Build Status](https://travis-ci.org/jasonsims/aws-cloudfront-sign.svg?branch=master)](https://travis-ci.org/jasonsims/aws-cloudfront-sign)
[![npm version](https://badge.fury.io/js/aws-cloudfront-sign.svg)](http://badge.fury.io/js/aws-cloudfront-sign)

---

**NOTE**

The [AWS SDK for JavaScript](https://docs.aws.amazon.com/en_pv/sdk-for-javascript/v2/developer-guide/welcome.html) has added support for generating signed URLs and Cookies.  Please see [Class: AWS.CloudFront.Signer](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFront/Signer.html)

---

Generating signed URLs for CloudFront links is a little more tricky than for S3. It's because signature generation for S3 URLs is handled a bit differently than CloudFront URLs and this functionality is not currently supported by the [aws-sdk](https://github.com/aws/aws-sdk-js) library for JavaScript. In case you also need to do this, I've created this simple utility to make things easier.

## Usage
### Requirements
* Node.js >=18
* Active CloudFront distribution with origin configured

### Configuring CloudFront
1. Create a CloudFront distribution
2. Configure your origin with the following settings:

   **Origin Domain Name:** {your-s3-bucket}
   **Restrict Bucket Access:** Yes
   **Grant Read Permissions on Bucket:** Yes, Update Bucket Policy
3. Create CloudFront Key Pair. [more info][cf_keypair_docs]

### Installing
```sh
npm install aws-cloudfront-sign
```

### TypeScript
```js
import { SignatureOptions } from 'aws-cloudfront-sign/types'
```

### Upgrading from 2.x to 3.x
* There shouldn't be any breaking changes when coming to 3.x. RTMP URLs were deprecated by Amazon
but that will affect all versions.
* Support for ES Modules was added
* Support for TypeScript was added

### Upgrading from 1.x to 2.x
* `expireTime` now takes it's value as milliseconds, Date, or
 [moment][moment_docs] instead of seconds.

### API
#### getSignedUrl(url, options)
* `@param {String} url` - Cloudfront URL to sign
* `@param {Object} options` - URL signature [options](#options)
* `@return {String} signedUrl` - Signed CloudFrontUrl

#### getSignedCookies(url, options)
* `@param {String} url` - Cloudfront URL to sign
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
* `expireTime` (**Optional** - Default: 1800 sec == 30 min) - The time when the URL should expire. Accepted values are
   * number - Time in milliseconds (`new Date().getTime() + 1800000`)
   * moment - Valid [momentjs][moment_docs] object (`moment().add(1, 'day')`)
   * Date - Javascript Date object (`new Date(2016, 0, 1)`)
* `ipRange` (**Optional**) - IP address range allowed to make GET requests
  for your signed URL. This value must be given in standard IPv4 CIDR format
  (for example, 10.52.176.0/24).
* `keypairId` - The access key ID from your Cloudfront keypair
* `privateKeyString` || `privateKeyPath` - The private key from your Cloudfront
   keypair. It can be provided as either a string or a path to the .pem file.
  **Note:** When providing the private key as a string, ensure that the newline
  character is also included.

  ```js
  const privateKeyString =
    '-----BEGIN RSA PRIVATE KEY-----\n'
    'MIIJKAIBAAKCAgEAwGPMqEvxPYQIffDimM9t3A7Z4aBFAUvLiITzmHRc4UPwryJp\n'
    'EVi3C0sQQKBHlq2IOwrmqNiAk31/uh4FnrRR1mtQm4x4IID58cFAhKkKI/09+j1h\n'
    'tuf/gLRcOgAXH9o3J5zWjs/y8eWTKtdWv6hWRxuuVwugciNckxwZVV0KewO02wJz\n'
    'jBfDw9B5ghxKP95t7/B2AgRUMj+r47zErFwo3OKW0egDUpV+eoNSBylXPXXYKvsL\n'
    'AlznRi9xNafFGy9tmh70pwlGG5mVHswD/96eUSuLOZ2srcNvd1UVmjtHL7P9/z4B\n'
    'KdODlpb5Vx+54+Fa19vpgXEtHgfAgGW9DjlZMtl4wYTqyGAoa+SLuehjAQsxT8M1\n'
    'BXqfMJwE7D9XHjxkqCvd93UGgP+Yxe6H+HczJeA05dFLzC87qdM45R5c74k=\n'
    '-----END RSA PRIVATE KEY-----'
  ```
  Also, here are some examples if prefer to store your private key as a string
  but within an environment variable.
  ```sh
  # Local env example
  CF_PRIVATE_KEY="$(cat your-private-key.pem)"

  # Heroku env
  heroku config:set CF_PRIVATE_KEY="$(cat your-private-key.pem)"
  ```

## Examples
### Creating a signed URL
By default the URL will expire after half an hour.
```js
// ESM: import { getSignedUrl } from 'aws-cloudfront-sign'
const cf = require('aws-cloudfront-sign')
const options = {keypairId: 'APKAJM2FEVTI7BNPCY4A', privateKeyPath: '/foo/bar'}
const signedUrl = cf.getSignedUrl('http://xxxxxxx.cloudfront.net/path/to/s3/object', options);
console.log('Signed URL: ' + signedUrl);
```

### Creating signed cookies
```js
// ESM: import { getSignedCookies } from 'aws-cloudfront-sign'
const cf = require('aws-cloudfront-sign')
const options = {keypairId: 'APKAJM2FEVTI7BNPCY4A', privateKeyPath: '/foo/bar'}
const signedCookies = cf.getSignedCookies('http://xxxxxxx.cloudfront.net/*', options);

// You can now set cookies in your response header. For example:
for(var cookieId in signedCookies) {
 res.cookie(cookieId, signedCookies[cookieId]);
}
```

[moment_docs]: http://momentjs.com/docs
[cf_keypair_docs]: http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html#private-content-creating-cloudfront-key-pairs
