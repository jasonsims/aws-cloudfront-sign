/**
 * Cloudfront URL signature utility.
 */

var url = require('url');
var crypto = require('crypto');
var fs = require('fs');
var util = require('util');
var _ = require('lodash');
var CannedPolicy = require('./CannedPolicy');

/**
 * Build an AWS signed URL.
 *
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
 * @return {String} Signed CloudFront URL
 */
function getSignedUrl(cfUrl, params) {
  var privateKey = _getPrivateKey(params);
  var policy = _createPolicy(
    cfUrl, _getExpireTime(params), _getIpRange(params));
  var signature = _createPolicySignature(policy, privateKey);
  var policyStr = new Buffer(policy.toJSON()).toString('base64');

  // Parse the cloudfront URL so we can add the querystring values required by
  // AWS signed URLs. We need to assign an empty string to the `search`
  // property so that the object value of `.query` is used when `.format()`
  // is called.
  var parsedUrl = url.parse(cfUrl, true);
  parsedUrl.search = '';
  _.extend(parsedUrl.query, {
    'Expires': policy.expireTime,
    'Policy': normalizeBase64(policyStr),
    'Signature': normalizeBase64(signature),
    'Key-Pair-Id': params.keypairId
  });

  // Return a formatted URL string with signature.
  return parsedUrl.format();
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
    rtmpStreamName: module.exports.getSignedUrl(s3key, params)
  };
}

/**
 * Build list of cookies for the specified resource
 *
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
 * @return {String} List of CloudFront cookies
 */
function getSignedCookies(cfUrl, params){
  var privateKey = _getPrivateKey(params);
  var policy = _createPolicy(
    cfUrl, _getExpireTime(params), _getIpRange(params));
  var signature = _createPolicySignature(policy, privateKey);
  var policyStr = new Buffer(policy.toJSON()).toString('base64');

  var cookies = {};
  cookies['CloudFront-Policy'] = normalizeBase64(policyStr);
  cookies['CloudFront-Signature'] = normalizeBase64(signature);
  cookies['CloudFront-Key-Pair-Id'] = params.keypairId;

  return cookies;
}

/**
 * Create a URL safe Base64 encoded string.
 *
 * This function will replace all characters that are invalid in a URL query
 * string with characters that are. AWS will translate these characters back to
 * their original value before processing.
 *
 * For more information, see
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html
 *
 * @param {String}: Base64 encoded string
 */
function normalizeBase64(str) {
  return str
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');
}

/**
 * Normalize all invalid AWS signature characters.
 *
 * For more information on AWS signatures, see
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html
 *
 * @deprecated
 * @param {String}: Base64 encoded signature string
 */
function normalizeSignature(sig) {
  console.log(
    'Deprecation Warning: "normalizeSignature" will soon be removed. Please ' +
    'use "normalizeBase64"');
  return normalizeBase64(sig);
}

/**
 * Create an AWS policy.
 *
 * @private
 * @param {string} CloudFront resource URL
 * @param {Number|Moment|Date} URL expiration time
 * @param {string} Source IP range in CIDER notation
 * @returns {Object} AWS policy object
 */
function _createPolicy(cfUrl, expireTime, ipRange) {
  // If an expiration time isn't set, default to 30 seconds.
  var defaultExpireTime = Math.round(Date.now() + 30000);
  expireTime = expireTime || defaultExpireTime;

  return new CannedPolicy(cfUrl, expireTime, ipRange);
}

/**
 * Create a policy signature.
 *
 * @private
 * @param {Object} AWS policy
 * @param {string} private key string for signature
 * @returns {string} Base64 encoded signature
 */
function _createPolicySignature(policy, privateKey) {
  var sign = crypto.createSign('RSA-SHA1');
  sign.update(policy.toJSON());

  return sign.sign(privateKey, 'base64');
}

/**
 * Return the expire time in milliseconds.
 *
 * This function will return the `expireTime` value in milliseconds. If the
 * value is not a number or a string it will use Object.valueOf
 *
 * @see http://momentjs.com/docs
 *
 * @param {Object} opts - Options object containing the expireTime
 * @return {Number} expireTime - Expire time represented in milliseconds
 */
function _getExpireTime(opts) {
  return +opts.expireTime || null;
}

/**
 * Helper function for retrieving the IP range from the params object.
 * @private
 */
function _getIpRange(opts) {
  return opts.ipRange || null;
}

/**
 * Helper function for retrieving the private key from the params object.
 * @private
 */
function _getPrivateKey(params) {
  var privateKeyString = params.privateKeyString;
  var pem;

  if (params.privateKeyPath) {
    pem = fs.readFileSync(params.privateKeyPath);
    privateKeyString = pem.toString('ascii');
  }

  var newLinePattern = /\r|\n/;
  var lineBreakExists = newLinePattern.test(privateKeyString);
  if (!lineBreakExists) {
      throw new Error('Invalid private key string, must include line breaks');
  }

  return privateKeyString;
}


exports.getSignedCookies = getSignedCookies;
exports.getSignedUrl = getSignedUrl;
exports.getSignedRTMPUrl = getSignedRTMPUrl;
exports.normalizeSignature = normalizeSignature;
exports.normalizeBase64 = normalizeBase64;
exports._getExpireTime = _getExpireTime;
exports._getIpRange = _getIpRange;
