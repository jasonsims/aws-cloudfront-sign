
var _ = require('lodash');
var test = require('tape');
var policy = require('../src/policy');

// 'Policy() should return an object';
// 'Policy() should error if URL is missing'
// 'Policy #isCanned() should return true if canned
// 'Policy #isCanned() should return false if not canned
// 'Policy #stringify() should stringify the policy'
// 'Policy #getExpireTime() should return expire time for policy'

test('Policy()', function(t) {
  var actual = policy('foo', {});
  t.equal(typeof actual, 'object', 'should return an object');
  t.end();
});

test('Policy() with no URL', function(t) {
  var fn = _.wrap(policy, function(fn) {fn()});

  t.throws(fn);
  t.end();
});


test('policy.isCanned()', function(t) {
  var p = policy('foo', {});

  p.isCanned();
  t.ok(p.isCanned(), 'should return true if canned');
  t.end();
});

test('policy.isCanned()', function(t) {
  var p = policy('foo', {});

  p.isCanned();
  t.ok(p.isCanned(), 'should return true if canned');
  t.end();
});

test('policy.stringify()', function(t) {
  var p = policy('foo', {expireTime: 1});
  var actual = p.stringify();
  var expected;


  t.deepLooseEqual(actual, expected, 'should stringify the policy');
  t.end();
});
