/**
 * Cloudfront URL signature utility.
 */

import { URL } from 'node:url';
import { SignatureOptions } from './types';
import { getPrivateKey, createPolicy, createPolicySignature, getExpireTime, getIpRange, normalizeBase64 } from './utils';

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
 * @deprecated
 * @param domainname - Cloudfront domain
 * @param s3key - S3 Key
 * @param params Signature parameters
 * @return Cloudfront server path and stream name with RTMP formatting
 */
export function getSignedRTMPUrl () {
  throw new Error('Amazon CloudFront has deprecated RTMP distributions. For more information see https://repost.aws/questions/QUoUZgHZh7SEWlnQUPlBmVNQ/announcement-rtmp-support-discontinuing-on-december-31-2020');
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
