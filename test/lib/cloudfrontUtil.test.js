var path = require('path');
var url = require('url');
var querystring = require('querystring');
var fs = require('fs');
var test = require('tap').test;
var cf = require(path.join(process.cwd(), 'lib', 'cloudfrontUtil'));
var DEFAULT_PARAMS = {
  keypairId: 'ABC123',
  privateKeyString: fs.readFileSync(
    path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii')
};

test('canned policy', function (t) {
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

test('signature', function (t) {
  var result = parseUrl(cf.getSignedUrl('http://foo.com', DEFAULT_PARAMS));
  t.ok(result.query.hasOwnProperty('Signature'), 'it should be created');
  t.end();
});

test('signature#_normalizeSignature', function (t) {
  var illegalChars = ['+', '=', '/'];
  var arg = illegalChars.join('');
  var sig = cf._normalizeSignature(arg);

  t.ok('-_~', 'it should translate illegal characters');
  t.end();
});

test('canned policy types', function (t) {
  var result1 = url.parse(cf.getSignedUrl('http://foo.com', {
    keypairId: 'ABC123',
    privateKeyString: fs.readFileSync(
      path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii'),
    expireTime: ((new Date(2033, 1, 1)).getTime() / 1000).toString()
  }));
  t.ok(result1.path.indexOf('=1990857600') > -1, 'it should support legacy unix time strings as expire times.');

  var result2 = url.parse(cf.getSignedUrl('http://foo.com', {
    keypairId: 'ABC123',
    privateKeyString: fs.readFileSync(
      path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii'),
    expireTime: ((new Date(2033, 1, 1)).getTime() / 1000)
  }));
  t.ok(result2.path.indexOf('=1990857600') > -1, 'it should support integer time expire times.');

  var result3 = url.parse(cf.getSignedUrl('http://foo.com', {
    keypairId: 'ABC123',
    privateKeyString: fs.readFileSync(
      path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii'),
    expireTime: new Date(2033, 1, 1)
  }));
  t.ok(result3.path.indexOf('=1990857600') > -1, 'it should support Date objects as expire times.');

  var result4;

  try {
    result4 = url.parse(cf.getSignedUrl('http://foo.com', {
      keypairId: 'ABC123',
      privateKeyString: fs.readFileSync(
        path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii'),
      expireTime: new Date(1000, 1, 1)
    }));
  } catch (e) {
  }
  t.ok(typeof(result4) == 'undefined', 'it should alert the developer about urls that have already expired.');

  var result5;

  try {
    result5 = url.parse(cf.getSignedUrl('http://foo.com', {
      keypairId: 'ABC123',
      privateKeyString: fs.readFileSync(
        path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii'),
      expireTime: new Date(3000, 1, 1)
    }));
  } catch (e) {
  }
  t.ok(typeof(result5) == 'undefined', 'it should alert the developer about invalid unix dates that AWS will not accept.');

  t.end();
});

test('RTMP URL Objects', function (t) {
  var result1 = cf.getSignedRTMPUrl('xxxxxx.cloudfront.net', 'mykeyfolder/mykey.mp4', {
    keypairId: 'ABC123',
    privateKeyString: fs.readFileSync(
      path.join(process.cwd(), 'test/files/dummy.pem')).toString('ascii'),
    expireTime: new Date(2033, 1, 1)
  });
  t.ok(result1.rtmpServerPath.indexOf('cfx/st') > -1, 'it should return a properly formatted rtmp server path.');
  t.ok(result1.rtmpStreamName.indexOf('Expires=1990857600') > -1, 'it should return a properly formatted rtmp stream name.');

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
