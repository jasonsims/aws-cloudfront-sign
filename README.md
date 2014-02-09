AWS CloudFront URL Signature Utility
===================

Generating signed URLs for CloudFront links is a little more tricky than for S3. It's because signature generation for S3 URLs is handled a bit differently than CloudFront URLs and this functionality is not currently supported by the [aws-sdk](https://github.com/aws/aws-sdk-js) library for JavaScript. In case you also need to do this, I've created this simple utility to make things easier.

## Setup
###Configure CloudFront
1. Create a CloudFront distribution
2. Configure your origin with the following settings:

   **Origin Domain Name:** {your-s3-bucket}  
   **Restrict Bucket Access:** Yes  
   **Grant Read Permissions on Bucket:** Yes, Update Bucket Policy  
3. Create CloudFront Key Pair.

###Installing
```sh
npm install aws-cloudfront-sign
```

###Usage
```javascript
var cf = require('aws-cloudfront-sign')
var params = {
  privateKeyString: process.env.PRIVATE_KEY,
  expireTime: '<epoch time when you wish the link to expire>'
}
cf.getSignedUrl('http://example.com/path/to/s3/object', params, function(err, url) {
  console.log('Signed URL: ' + url)
})
```

