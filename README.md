AWS CloudFront URL Signature Utility  
===================
[![Circle CI](https://circleci.com/gh/jasonsims/aws-cloudfront-sign/tree/master.svg?style=svg)](https://circleci.com/gh/jasonsims/aws-cloudfront-sign/tree/master)

Generating signed URLs for CloudFront links is a little more tricky than for S3. It's because signature generation for S3 URLs is handled a bit differently than CloudFront URLs and this functionality is not currently supported by the [aws-sdk](https://github.com/aws/aws-sdk-js) library for JavaScript. In case you also need to do this, I've created this simple utility to make things easier.

## Setup
###Configure CloudFront
1. Create a CloudFront distribution
2. Configure your origin with the following settings:

   **Origin Domain Name:** {your-s3-bucket}  
   **Restrict Bucket Access:** Yes  
   **Grant Read Permissions on Bucket:** Yes, Update Bucket Policy  
3. Create CloudFront Key Pair.

###Installation &nbsp;  [![npm version](https://badge.fury.io/js/aws-cloudfront-sign.svg)](http://badge.fury.io/js/aws-cloudfront-sign)
```sh
npm install aws-cloudfront-sign
```

###Usage
```javascript
var cf = require('aws-cloudfront-sign')
var params = {
  keypairId: process.env.PUBLIC_KEY,
  privateKeyString: process.env.PRIVATE_KEY,
  privateKeyPath: '/path/to/private/key',      // Optional. Use as an alternative to privateKeyString.
  expireTime: new Date(2016, 0, 1) // January 1, 2016
}
var signedUrl = cf.getSignedUrl('http://example.com/path/to/s3/object', params);
console.log('Signed URL: ' + signedUrl);

var signedRTMPUrlObj = cf.getSignedRTMPUrl('xxxxxxx.cloudfront.net', 'path/to/s3/object', params);
console.log('RTMP Server Path: ' + signedRTMPUrlObj.rtmpServerPath);
console.log('Signed Stream Name: ' + signedRTMPUrlObj.rtmpStreamName);
```
