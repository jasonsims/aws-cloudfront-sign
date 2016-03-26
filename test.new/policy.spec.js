
var _ = require('lodash');
var assert = require('chai').assert;
var sinon = require('sinon');
var policy = require('../src/policy');
var util = require('../src/util');

describe('Policy', function() {
  // Setup
  //------
  beforeEach(function() {
    sinon.stub(util, 'parseTime');
    sinon.stub(util, 'getNow');
  });
  afterEach(function() {
    util.parseTime.restore();
    util.getNow.restore();
  });

  // Tests
  //------
  describe('when called', function() {
    it('should return an object', function(done) {
      var res = policy('foo', {});
      var actual = _.isObject(res) && !_.isArray(res);

      assert.ok(actual);
      done();
    });

    it('should error if "url" is missing', function() {
      var fn = _.wrap(policy, function(fn) {fn()});
      assert.throws(fn);
    });

    it('should default "expireTime" to 30 seconds', function() {
      var p = policy('foo', {});
      assert.ok(util.getNow.calledWith(3000));
    });
  });

  describe('#isCanned()', function() {
    it('should return true if only "expireTime" is available', function() {
      var p = policy('foo', {});
      assert.ok(p.isCanned());
    });
    it('should return false if "startTime" is available', function() {
      var p = policy('foo', {startTime: 1});
      assert.notOk(p.isCanned());
    });
    it('should return false if "ipAddress" is available', function() {
      var p = policy('foo', {ipAddress: 1});
      assert.notOk(p.isCanned());
    });
  });

  describe('#stringify()', function() {
    it('should stringify the policy', function() {
      util.parseTime.returns(1234);

      var p = policy('foo', {});
      var actual = JSON.parse(p.stringify());
      var expected = {
        Statement: [{
          Resource: 'foo',
          Condition: {DateLessThan: {'AWS:EpochTime': 1234}}
        }]
      };

      assert.deepEqual(actual, expected);
    });
  });

  describe('#getExpireTime()', function() {
    it('should return the expireTime value', function() {
      util.parseTime.returns(1234);

      var p = policy('foo', {});
      var actual = p.getExpireTime();
      var expected = 1234;

      assert.equal(actual, expected);
    });

  });

});
