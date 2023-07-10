import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import CannedPolicy from './canned-policy';
import { SignatureOptions } from './types';

/**
 * Create a URL safe Base64 encoded string.
 *
 * This function will replace all characters that are invalid in a URL query
 * string with characters that are. AWS will translate these characters back to
 * their original value before processing.
 *
 * For more information, see
 * http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-canned-policy.html
 */
export function normalizeBase64 (str: string): string {
  return str
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');
}

/**
 * Create an AWS policy.
 */
export function createPolicy (cfUrl: string, expireTime: number, ipRange: string): CannedPolicy {
  // If an expiration time isn't set, default to 30 minutes.
  const defaultExpireTime = Math.round(Date.now() + 1800000);
  expireTime = expireTime || defaultExpireTime;

  return new CannedPolicy(cfUrl, expireTime, ipRange);
}

/**
 * Create a policy signature.
 */
export function createPolicySignature (policy: CannedPolicy, privateKey: string): string {
  const sign = createSign('RSA-SHA1');
  sign.update(policy.toJSON());

  return sign.sign(privateKey, 'base64');
}

/**
 * Return the expire time in milliseconds.
 *
 * This function will return the `expireTime` value in milliseconds. If the
 * value is not a number or a string it will use Object.valueOf
 *
 * @see http://momentjs.com/docs
 */
export function getExpireTime (opts: SignatureOptions): number {
  return +opts.expireTime || null;
}

/**
 * Helper function for retrieving the IP range from the params object.
 */
export function getIpRange (opts: SignatureOptions) {
  return opts.ipRange || null;
}

/**
 * Helper function for retrieving the private key from the params object.
 */
export function getPrivateKey (params: SignatureOptions): string {
  let privateKeyString = params.privateKeyString;
  let pem;

  if (params.privateKeyPath) {
    pem = readFileSync(params.privateKeyPath);
    privateKeyString = pem.toString('ascii');
  }

  const newLinePattern = /\r|\n/;
  const lineBreakExists = newLinePattern.test(privateKeyString);
  if (!lineBreakExists) {
    throw new Error('Invalid private key string, must include line breaks');
  }

  return privateKeyString;
}

/**
 * Assert that an expression evaluates to `true`
 */
export function assert (assertion: boolean, msg: string) {
  if (!assertion) {
    throw new Error(msg);
  }
}
