/**
 * Cloudfront utility tests
 *
 * TODO: Add mock for crypto methods
 * TODO: Add mock for fs methods
 * TODO: Add mock for CannedPolicy methods
 */

var fs = require('fs');
var path = require('path');
var url = require('url');
var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var moment = require('moment');
var sinon = require('sinon');
var CloudfrontUtil = require('../../lib/cloudfrontUtil');

describe('CloudfrontUtil', function() {
  var defaultParams;
  var pkey;
  var pkeyPath;
  var clock;

  // Setup
  //------
  beforeEach(function(done) {
    clock = sinon.useFakeTimers();
    pkeyPath = './test/files/dummy.pem';
    pkey = fs.readFileSync(path.join(process.cwd(), pkeyPath));
    defaultParams = {
      keypairId: 'ABC123',
      privateKeyString: pkey.toString('ascii')
    };

    done();
  });

  afterEach(function(done) {
    clock.restore();
    done();
  });

  // Tests
  //------
  describe('#getSignedUrl()', function() {
    it('should accept `expireTime` as a string', function(done) {
      var testExpireTime = moment().add(1, 'day').unix() * 1000;
      var params = _.extend({}, defaultParams, {
        expireTime: testExpireTime.toString()
      });
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);
      var expectedResult = (testExpireTime / 1000).toString();

      expect(parsedResult.query.Expires).to.equal(expectedResult);
      done();
    });

    it('should accept `expireTime` as a number', function(done) {
      var testExpireTime = moment().add(1, 'day').unix() * 1000;
      var params = _.extend({}, defaultParams, {
        expireTime: testExpireTime
      });
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);
      var expectedResult = (testExpireTime / 1000).toString();

      expect(parsedResult.query.Expires).to.equal(expectedResult);
      done();
    });

    it('should accept `expireTime` as a moment', function(done) {
      var testExpireTime = moment().add(1, 'day');
      var params = _.extend({}, defaultParams, {
        expireTime: testExpireTime
      });
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);
      var expectedResult = testExpireTime.unix().toString();

      expect(parsedResult.query.Expires).to.equal(expectedResult);
      done();
    });

    it('should accept `expireTime` as a Date', function(done) {
      var testExpireTime = new Date(new Date().getTime() + 10000);
      var params = _.extend({}, defaultParams, {
        expireTime: testExpireTime
      });
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);
      var expectedResult =
        Math.round(testExpireTime.getTime() / 1000).toString();

      expect(parsedResult.query.Expires).to.equal(expectedResult);
      done();
    });

    it('should accept private key as string', function(done) {
      var testExpireTime = moment().add(1, 'day').unix() * 1000;
      var params = _.extend({}, defaultParams);
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);

      expect(parsedResult.query).to.have.property('Signature');
      done();
    });

    it('should fail to accept singe line private key as string', function(done) {
      var testExpireTime = moment().add(1, 'day').unix() * 1000;
      var params = _.extend({}, defaultParams);
      params.privateKeyString = "this_is_a_test_..._a_single_line_string";

      expect(CloudfrontUtil.getSignedUrl.bind('http://foo.com', params)).to.throw(Error);
      done();
    });

    it('should accept private key as filepath', function(done) {
      var testExpireTime = moment().add(1, 'day').unix() * 1000;
      var params = _.extend({}, defaultParams, {
        privateKeyPath: path.join(process.cwd(), pkeyPath)
      });
      var result;
      var parsedResult;

      delete params.privateKeyString;
      result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      parsedResult = url.parse(result, true);

      expect(parsedResult.query).to.have.property('Signature');
      done();
    });

    it('should default `expireTime` to 30 seconds', function(done) {
      var params = _.extend({}, defaultParams);
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);

      expect(parsedResult.query.Expires).to.equal('30');
      done();
    });

    it('should add base64-encoded `Policy` query param', function(done) {
      var params = _.extend({}, defaultParams);
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);
      var policy = _deserializePolicy(parsedResult.query.Policy);

      expect(policy).to.have.property('Statement');
      expect(policy.Statement[0]).to.have.property('Resource');
      expect(policy.Statement[0].Resource).to.equal('http://foo.com');
      done();
    });

    it('should include original query params', function(done) {
      var params = _.extend({}, defaultParams);
      var result = CloudfrontUtil.getSignedUrl(
        'http://foo.com?test=true', params);
      var parsedResult = url.parse(result, true);

      expect(parsedResult.query).to.have.property('test', 'true');
      expect(parsedResult.query).to.have.property('Expires');
      expect(parsedResult.query).to.have.property('Signature');
      expect(parsedResult.query).to.have.property('Key-Pair-Id');
      expect(parsedResult.query).to.have.property('Policy');

      done();
    });

    it('should return a signed URL', function(done) {
      var params = _.extend({}, defaultParams);
      var result = CloudfrontUtil.getSignedUrl('http://foo.com', params);
      var parsedResult = url.parse(result, true);

      expect(parsedResult.query).to.have.property('Expires');
      expect(parsedResult.query).to.have.property('Signature');
      expect(parsedResult.query).to.have.property('Key-Pair-Id');
      expect(parsedResult.query).to.have.property('Policy');

      done();
    });
  });

  describe('#getSignedRTMPUrl()', function() {
    var signedUrlStub;

    beforeEach(function(done) {
      signedUrlStub = sinon.stub(CloudfrontUtil, 'getSignedUrl', _.noop);
      done();
    });

    afterEach(function(done) {
      signedUrlStub.restore();
      done();
    });

    it('should return RTMP object', function(done) {
      var params = 'test';
      var s3key = 'test/key';
      var res = CloudfrontUtil.getSignedRTMPUrl('foo.com', s3key, params);

      expect(signedUrlStub.calledWith(s3key, params)).to.equal(true);
      expect(res).to.have.property('rtmpServerPath', 'rtmp://foo.com/cfx/st');
      expect(res).to.have.property('rtmpStreamName');

      done();
    });

    it('should fail if `domainname` is missing', function(done) {
      var fn = function() {CloudfrontUtil.getSignedRTMPUrl();};
      expect(fn).to.throw(Error, /domain name doesn't look right/i);
      done();
    });

    it('should fail if `domainname` is invalid', function(done) {
      var fn = function() {CloudfrontUtil.getSignedRTMPUrl('https://foo.com');};
      expect(fn).to.throw(Error, /domain name doesn't look right/i);
      done();
    });

    it('should fail if `s3key` is missing', function(done) {
      var fn = function() {CloudfrontUtil.getSignedRTMPUrl('foo.com');};
      expect(fn).to.throw(Error, /s3 key doesn't look right/i);
      done();
    });

    it('should fail if `s3key` is invalid', function(done) {
      var fn = function() {CloudfrontUtil.getSignedRTMPUrl('foo.com', '/key');};
      expect(fn).to.throw(Error, /s3 key doesn't look right/i);
      done();
    });
  });

  describe('#getSignedCookies()', function() {
    it('should create cookies object', function(done) {
      var result = CloudfrontUtil.getSignedCookies(
        'http://foo.com', defaultParams);

      expect(result).to.have.property('CloudFront-Policy');
      expect(result).to.have.property('CloudFront-Signature');
      expect(result).to.have.property('CloudFront-Key-Pair-Id');
      done();
    });
  });
  describe('#normalizeBase64()', function() {
    it('should translate illegal characters', function(done) {
      var illegalChars = ['+', '=', '/'];
      var arg = illegalChars.join('');
      var sig = CloudfrontUtil.normalizeBase64(arg);

      expect(sig).to.equal('-_~');
      done();
    });

    it('should not alter valid characters', function(done) {
      var sig = CloudfrontUtil.normalizeBase64('test+str');

      expect(sig).to.equal('test-str');
      done();
    });
  });
});

// Private
//--------

function _deserializePolicy(policy) {
  var safeBase64Chars = {'+': '-', '=': '_', '/': '~'};

  _.each(safeBase64Chars, function(safeChar, actualChar) {
    var re = new RegExp('\\' + safeChar, 'g');
    policy = policy.replace(re, actualChar);
  });

  return JSON.parse(new Buffer(policy, 'base64').toString('ascii'));
}
