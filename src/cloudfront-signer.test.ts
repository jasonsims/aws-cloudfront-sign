import { describe, it } from '@jest/globals';

describe('CloudfrontUtil', function () {
  // let defaultParams;
  // let pkey;
  // let pkeyPath;
  // let clock;

  // Setup
  // ------
  // beforeEach(function () {
  //   clock = sinon.useFakeTimers();
  //   pkeyPath = './test/files/dummy.pem';
  //   pkey = fs.readFileSync(path.join(process.cwd(), pkeyPath));
  //   defaultParams = {
  //     keypairId: 'ABC123',
  //     privateKeyString: pkey.toString('ascii')
  //   };

  //   done();
  // });

  // afterEach(function (done) {
  //   clock.restore();
  //   done();
  // });

  // Tests
  // ------
  describe('getSignedUrl', function () {
    it.todo('should accept `expireTime` as a string');

    it.todo('should accept `expireTime` as a number');

    it.todo('should accept `expireTime` as a moment');

    it.todo('should accept `expireTime` as a Date');

    it.todo('should accept private key as string');

    it.todo('should fail to accept singe line private key as string');

    it.todo('should accept private key as filepath');

    it.todo('should default `expireTime` to 30 minutes (1800 seconds)');

    it.todo('should add base64-encoded `Policy` query param');

    it.todo('should include original query params');

    it.todo('should return a signed URL');
  });

  describe('getSignedRTMPUrl', function () {
    // var signedUrlStub;

    // beforeEach(function(done) {
    //   signedUrlStub = sinon.stub(CloudfrontUtil, 'getSignedUrl', _.noop);
    //   done();
    // });

    // afterEach(function(done) {
    //   signedUrlStub.restore();
    //   done();
    // });

    it.todo('should return RTMP object');

    it.todo('should fail if `domainname` is missing');

    it.todo('should fail if `domainname` is invalid');

    it.todo('should fail if `s3key` is missing');

    it.todo('should fail if `s3key` is invalid');
  });

  describe('getSignedCookies', function () {
    it.todo('should create cookies object');
  });
});
