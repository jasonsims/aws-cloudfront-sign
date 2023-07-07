/**
 * Cloudfront URL signature utility.
 */

import { URL } from 'node:url';
import { SignatureOptions } from './types';
import { getPrivateKey, createPolicy, createPolicySignature, getExpireTime, getIpRange, normalizeBase64 } from './utils';

interface SignedRtmpUrl {
  rtmpServerPath: string;
  rtmpStreamName: string
}

/**
 * Build an AWS signed URL.
 *
 * @param cfUrl CloudFront resource URL
 * @param params Signature parameters
 * @return Signed CloudFront URL
 */
export function getSignedUrl (cfUrl: string, params: SignatureOptions): string {
  const privateKey = getPrivateKey(params);
  const policy = createPolicy(cfUrl, getExpireTime(params), getIpRange(params));
  const signature = createPolicySignature(policy, privateKey);
  const policyStr = Buffer.from(policy.toJSON()).toString('base64');

  // Parse the cloudfront URL so we can add the querystring values required by
  // AWS signed URLs. We need to assign an empty string to the `search`
  // property so that the object value of `.query` is used when `.format()`
  // is called.
  const parsedUrl = new URL(cfUrl);

  parsedUrl.searchParams.set('Expires', `${policy.expireTime}`);
  parsedUrl.searchParams.set('Policy', normalizeBase64(policyStr));
  parsedUrl.searchParams.set('Signature', normalizeBase64(signature));
  parsedUrl.searchParams.set('Key-Pair-Id', params.keypairId);

  // Return a formatted URL string with signature.
  return parsedUrl.toString();
}

/**
 * Build an AWS signed RTMP URL assuming your distribution supports this.
 *
 * @param domainname - Cloudfront domain
 * @param s3key - S3 Key
 * @param params Signature parameters
 * @return Cloudfront server path and stream name with RTMP formatting
 */
export function getSignedRTMPUrl (domainname: string, s3key: string, params: SignatureOptions): SignedRtmpUrl {
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
 * Build list of cookies for the specified resource
 *
 * @param cfUrl - CloudFront resource URL
 * @param params - Signature parameters
 * @return List of CloudFront cookies
 */
export function getSignedCookies (cfUrl: string, params: SignatureOptions): Record<string, string> {
  const privateKey = getPrivateKey(params);
  const policy = createPolicy(
    cfUrl, getExpireTime(params), getIpRange(params));
  const signature = createPolicySignature(policy, privateKey);
  const policyStr = Buffer.from(policy.toJSON()).toString('base64');

  const cookies: Record<string, string> = {};
  cookies['CloudFront-Policy'] = normalizeBase64(policyStr);
  cookies['CloudFront-Signature'] = normalizeBase64(signature);
  cookies['CloudFront-Key-Pair-Id'] = params.keypairId;

  return cookies;
}
