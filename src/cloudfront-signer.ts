/**
 * Cloudfront URL signature utility.
 */

import { URL } from 'node:url';
import { SignatureOptions } from './types.js';
import {
  getPrivateKey,
  createPolicy,
  getExpireTime,
  getIpRange,
  normalizeBase64,
  signPolicy,
} from './utils.js';

/**
 * Build, serialize and sign the canned policy for a resource.
 *
 * @param cfUrl CloudFront resource URL
 * @param params Signature parameters
 * @return Policy expiry (seconds) plus URL-safe base64 policy and signature
 */
function createSignedPolicy(cfUrl: string, params: SignatureOptions) {
  const privateKey = getPrivateKey(params);
  const policy = createPolicy(cfUrl, getExpireTime(params), getIpRange(params));
  const policyJson = policy.toJSON();
  const signature = signPolicy(
    policyJson,
    privateKey,
    params.privateKeyPassphrase,
  );

  return {
    expireTime: policy.expireTime,
    policy: normalizeBase64(Buffer.from(policyJson).toString('base64')),
    signature: normalizeBase64(signature),
  };
}

/**
 * Build an AWS signed URL.
 *
 * @param cfUrl CloudFront resource URL
 * @param params Signature parameters
 * @return Signed CloudFront URL
 */
export function getSignedUrl(cfUrl: string, params: SignatureOptions): string {
  const { expireTime, policy, signature } = createSignedPolicy(cfUrl, params);

  // Parse the CloudFront URL so we can add the query string values required
  // by AWS signed URLs.
  const parsedUrl = new URL(cfUrl);

  parsedUrl.searchParams.set('Expires', `${expireTime}`);
  parsedUrl.searchParams.set('Policy', policy);
  parsedUrl.searchParams.set('Signature', signature);
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
export function getSignedRTMPUrl() {
  throw new Error(
    'Amazon CloudFront has deprecated RTMP distributions. For more information see https://repost.aws/questions/QUoUZgHZh7SEWlnQUPlBmVNQ/announcement-rtmp-support-discontinuing-on-december-31-2020',
  );
}

/**
 * Build list of cookies for the specified resource
 *
 * @param cfUrl - CloudFront resource URL
 * @param params - Signature parameters
 * @return List of CloudFront cookies
 */
export function getSignedCookies(
  cfUrl: string,
  params: SignatureOptions,
): Record<string, string> {
  const { policy, signature } = createSignedPolicy(cfUrl, params);

  return {
    'CloudFront-Policy': policy,
    'CloudFront-Signature': signature,
    'CloudFront-Key-Pair-Id': params.keypairId,
  };
}
