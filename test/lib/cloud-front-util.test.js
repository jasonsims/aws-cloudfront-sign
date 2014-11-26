var path = require('path');
var url = require('url');
var querystring = require('querystring');
var fs = require('fs');
var test = require('tap').test;
var cf = require(path.join(process.cwd(), 'lib', 'cloudfront-util'));
var DEFAULT_PARAMS = {
  keypairId: 'ABC123',
  privateKeyString: fs.readFileSync(
    path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii')
};

test('canned policy', function(t) {
  var now = new Date();
  var result = url.parse(cf.getSignedUrl('http://foo.com', DEFAULT_PARAMS));
  var expireDiff;

  result.query = querystring.parse(result.search.split('?')[1]);
  t.equal(result.hostname, 'foo.com', 'it should set the appropriate domain');
  t.equal(result.query['Key-Pair-Id'], DEFAULT_PARAMS.keypairId,
    'it should set the key pair id');

  expireDiff = Math.abs(
    new Date(result.query.Expires * 1000).getSeconds() - now.getSeconds());
  t.ok(29 <= expireDiff && 31 >= expireDiff,
    'it should default `expires` to ~30 seconds from creation date');
  t.end();
});

test('signature', function(t) {
  var result = parseUrl(cf.getSignedUrl('http://foo.com', DEFAULT_PARAMS));
  t.ok(result.query.hasOwnProperty('Signature'), 'it should be created');
  t.end();
});

test('signature#_normalizeSignature', function(t) {
  var illegalChars = ['+', '=', '/'];
  var arg = illegalChars.join('');
  var sig = cf._normalizeSignature(arg);

  t.ok('-_~', 'it should translate illegal characters');
  t.end();
});

/**
 * Parse a URL string
 *
 * @param {String} Full url to parse
 * @return {Object}
 */
function parseUrl(str) {
  var _url = url.parse(str);
  _url.query = querystring.parse(_url.query);

  return _url;
}
