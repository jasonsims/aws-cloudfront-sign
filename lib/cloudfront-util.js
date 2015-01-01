
var crypto = require('crypto');
var fs = require('fs');
var util = require('util');
var CannedPolicy = require('./CannedPolicy');

/**
 * Build an AWS signed URL.
 *
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
 * @return {String} Signed CloudFront URL
 */
function getSignedUrl(url, params) {
  // If an expiration time isn't set, default to 30 seconds.
  var defaultExpireTime = new Date(new Date().getTime() + 30000);
  var expireTime = typeof params.expireTime !== 'undefined' ?
      params.expireTime :
      defaultExpireTime;
  var policy = new CannedPolicy(url, expireTime);
  var sign = crypto.createSign('RSA-SHA1');
  var privateKeyString = params.privateKeyString;
  var pem;
  var signature;
  var urlParams;
  sign.update(policy.toJSON());

  // Stringify private key if supplied as a file path.
  if (params.privateKeyPath) {
    pem = fs.readFileSync(params.privateKeyPath);
    privateKeyString = pem.toString('ascii');
  }

  signature = sign.sign(privateKeyString, 'base64');
  urlParams = [
    'Expires=' + Math.round(policy.expireTime.getTime() / 1000),
    'Signature=' + _normalizeSignature(signature),
    'Key-Pair-Id=' + params.keypairId
  ];

  // Return a formatted URL string with signature.
  return util.format('%s?%s', url, urlParams.join('&'));
}

/**
 * Build an AWS signed RTMP URL assuming your distribution supports this.
 *
 * @param {String} Cloudfront domain
 * @param {String} S3 key
 * @param {Object} Signature parameters
 * @return {Object} Cloudfront server path and stream name with RTMP formatting
 */
function getSignedRTMPUrl(domainname, s3key, params) {

  if (!domainname || domainname.indexOf('/') > -1) {
    throw new Error(
        'Supplied domain name doesn\'t look right. ' +
        'Example: \'xxxxxxxx.cloudfront.net\'. Omit \'http\' and any paths.'
    );
  }

  if (!s3key || s3key.length === 0 || s3key.charAt(0) === '/') {
    throw new Error(
        'Supplied s3 key doesn\'t look right. ' +
        'Example: \'myfolder/bla.mp4\'. Omit preceding slashes or hostnames.'
    );
  }

  return {
    rtmpServerPath: 'rtmp://' + domainname + '/cfx/st',
    rtmpStreamName: getSignedUrl(s3key, params)
  };
}

/**
 * Normalize all invalid AWS signature characters.
 *
 * For more information on AWS signatures, see
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html
 *
 * @param {String}: Base64 encoded signature string
 */
function _normalizeSignature(sig) {
  var badCharMap = {'+': '-', '=': '_', '/': '~'};
  Object.keys(badCharMap).forEach(function(badChar) {
    var re = new RegExp('\\' + badChar, 'g');
    sig = sig.replace(re, badCharMap[badChar]);
  });
  return sig;
}

exports.getSignedUrl = getSignedUrl;
exports.getSignedRTMPUrl = getSignedRTMPUrl;
exports._normalizeSignature = _normalizeSignature;
