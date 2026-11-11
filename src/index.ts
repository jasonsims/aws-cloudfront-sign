export {
  getSignedUrl,
  // oxlint-disable-next-line typescript/no-deprecated -- still public API until removed
  getSignedRTMPUrl,
  getSignedCookies,
} from './cloudfront-signer.js';
export * as CannedPolicy from './canned-policy.js';
export type {
  AwsPolicy,
  ExpireTime,
  PolicyCondition,
  PolicyStatement,
  SignatureOptions,
} from './types.js';
