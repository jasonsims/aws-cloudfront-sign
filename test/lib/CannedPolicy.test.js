/**
 * Canned policy tests
 */

var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;
var CannedPolicy = require('../../lib/CannedPolicy');

describe('CannedPolicy', function() {

  it('should convert `expireTime` to seconds', function(done) {
    var expireTimeMs = new Date().getTime();
    var expireTimeSecs = Math.round(expireTimeMs / 1000);
    var policy = new CannedPolicy('http://t.com', expireTimeMs);

    expect(policy.expireTime).to.equal(expireTimeSecs);
    done();
  });

  describe('#toJSON()', function() {
    it('should fail if `url` is missing', function(done) {
      var expireTimeMs = new Date().getTime();
      var policy = new CannedPolicy(undefined, expireTimeMs);
      var func = _.bind(policy.toJSON, policy);

      expect(func).to.throw(Error, /missing param: url/i);
      done();
    });
    it('should fail if `expireTime` is missing', function(done) {
      var policy = new CannedPolicy('test');
      var func = _.bind(policy.toJSON, policy);

      expect(func).to.throw(Error, /missing param: expireTime/i);
      done();
    });
    it('should fail if `expireTime` is after the end of time', function(done) {
      var policy = new CannedPolicy('test', 3000000000000);
      var func = _.bind(policy.toJSON, policy);

      expect(func).to.throw(Error, /expireTime must be less than.*/i);
      done();
    });
    it('should fail if `expireTime` is before now', function(done) {
      var beforeNow = new Date().getTime() - 10000;
      var policy = new CannedPolicy('test', beforeNow);
      var func = _.bind(policy.toJSON, policy);

      expect(func).to.throw(Error, /.*must be after the current time$/i);
      done();
    });
    it('should support IP restrictions', function(done) {
      var expireTimeMs = new Date().getTime() + 10000;
      var policy = new CannedPolicy('http://t.com', expireTimeMs, "1.2.3.0/24");
      var result = policy.toJSON();
      var parsedResult;

      expect(result).to.be.a('string');

      // Parse the stringified result so we can examine it's properties.
      parsedResult = JSON.parse(result);

      expect(parsedResult).to.have.deep.property(
        'Statement[0].Condition.IpAddress.AWS:SourceIp', "1.2.3.0/24");

      done();
    });
    it('should exclude IP restrictions if none were given', function(done) {

      var policy = new CannedPolicy('http://t.com', Date.now() + 1000);
      var result = policy.toJSON();
      var parsedResult;

      // Parse the stringified result so we can examine it's properties.
      parsedResult = JSON.parse(result);

      expect(parsedResult).to.not.have.deep.property(
        'Statement[0].Condition.IpAddress.AWS:SourceIp');

      done();
    });
    it('should return the canned policy as stringified JSON', function(done) {
      var expireTimeMs = new Date().getTime() + 10000;
      var expireTimeSecs = Math.round(expireTimeMs / 1000);
      var policy = new CannedPolicy('http://t.com', expireTimeMs);
      var result = policy.toJSON();
      var parsedResult;

      expect(result).to.be.a('string');

      // Parse the stringified result so we can examine it's properties.
      parsedResult = JSON.parse(result);

      expect(parsedResult).to.have.deep.property(
        'Statement[0].Resource', 'http://t.com');
      expect(parsedResult).to.have.deep.property(
        'Statement[0].Condition.DateLessThan.AWS:EpochTime', expireTimeSecs);

      done();
    });
  });
});
