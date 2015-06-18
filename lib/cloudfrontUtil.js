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
 * Generate base-64 encoded policy string
 *
 * If policy is used for signed cookie, this function will also
 * substitute bad characters with the appropriate one as outlined here
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-setting-signed-cookie-custom-policy.html
 * 
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
 * @param {Boolean} Whether or not this policy will be used for cookies
 * @return {String} base-64 encoded policy string
 */
function genPolicy(cfUrl, params, forCookie){
  forCookie = forCookie || false;

  var policy = new CannedPolicy(cfUrl, params.expireTime);

  policy = Buffer(policy.toJSON()).toString('base64');
  if(forCookie){
    policy = safeBase64(policy);
  }
  return policy
}

/**
 * Generate signature for the given resource
 *
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
* @return {String} Signature
 */
function genSig(cfUrl, params){
  var sign = crypto.createSign('RSA-SHA1');
  var privateKeyString = params.privateKeyString;
  var parsedUrl;
  var pem;
  var signature;
  var policy = new CannedPolicy(cfUrl, params.expireTime);
  sign.update(policy.toJSON());

  // Stringify private key if supplied as a file path.
  if (params.privateKeyPath) {
    pem = fs.readFileSync(params.privateKeyPath);
    privateKeyString = pem.toString('ascii');
  }
  signature = sign.sign(privateKeyString, 'base64');
  return safeBase64(signature);
}

/**
 * Build an AWS signed URL.
 *
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
 * @return {String} Signed CloudFront URL
 */
function getSignedUrl(cfUrl, params) {
  // If an expiration time isn't set, default to 30 seconds.
  var defaultExpireTime = Math.round(new Date().getTime() + 30000);

  var expireT = _getExpireTime(params);
  params.expireTime = _getExpireTime(params) || defaultExpireTime;

  var sig = genSig(cfUrl, params);
  var policy = genPolicy(cfUrl, params);

  // Parse the cloudfront URL so we can add the querystring values required by
  // AWS signed URLs. We need to assign an empty string to the `search`
  // property so that the object value of `.query` is used when `.format()`
  // is called.
  parsedUrl = url.parse(cfUrl, true);
  parsedUrl.search = '';
  _.extend(parsedUrl.query, {
    'Expires': params.expireTime / 1000,
    'Policy': policy,
    'Signature': sig,
    'Key-Pair-Id': params.keypairId
  });

  // Return a formatted URL string with signature.
  return parsedUrl.format();
}

/**
 * Build list of cookies for the specified resource
 *
 * @param {String} CloudFront resource URL
 * @param {Object} Signature parameters
 * @return {String} List of CloudFront cookies 
 */
function getSignedCookies(cfUrl, params){
  // If an expiration time isn't set, default to 30 seconds.
  var defaultExpireTime = Math.round(new Date().getTime() + 30000);
  params.expireTime = _getExpireTime(params) || defaultExpireTime;
  var sig = genSig(cfUrl, params);
  var policy = genPolicy(cfUrl, params, true);

  var cookies = {};
  cookies['CloudFront-Policy'] = policy;
  cookies['CloudFront-Signature'] = sig;
  cookies['CloudFront-Key-Pair-Id'] = params.keypairId
  return cookies;
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
 * Normalize all invalid AWS signature characters.
 *
 * For more information on AWS signatures, see
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html
 *
 * @param {String}: Base64 encoded signature string
 */
function safeBase64(str) {
  var badCharMap = {'+': '-', '=': '_', '/': '~'};
  Object.keys(badCharMap).forEach(function (badChar) {
    var re = new RegExp('\\' + badChar, 'g');
    str = str.replace(re, badCharMap[badChar]);
  });
  return str;
}

/**
 * Return the expire time in milliseconds.
 *
 * This function will return the `expireTime` value in milliseconds. If the
 * value is not a number or a string it will use duck typing to determine if a
 * moment or Date object have been passed instead and call their appropriate
 * function.
 *
 * @see http://momentjs.com/docs
 *
 * @param {Object} opts - Options object containing the expireTime
 * @return {Number} expireTime - Expire time represented in milliseconds
 */
function _getExpireTime(opts) {
  if (!opts.expireTime) {return null;}
  var val = opts.expireTime;

  if (typeof val === 'number') {return Math.round(val);}
  if (typeof val === 'string') {return parseInt(val);}

  // If the value has a `.unix()` function then assume an instance of momentjs
  // was given and execute that method.
  if (typeof val.unix === 'function') {return val.unix() * 1000;}

  // If a Date object was given then convert it to milliseconds.
  if (val instanceof Date) {return Math.round(val.getTime());}

  // However, if the value provided did not match any of the supported types
  // then throw an error since we were unable to figure out a date to use.
  throw new Error('Invalid `expireTime` value');
}

exports.getSignedCookies = getSignedCookies;
exports.getSignedUrl = getSignedUrl;
exports.getSignedRTMPUrl = getSignedRTMPUrl;
exports.safeBase64 = safeBase64;
exports._getExpireTime = _getExpireTime;
