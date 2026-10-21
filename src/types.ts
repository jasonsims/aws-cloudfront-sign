/**
 * An expiry time accepted by `expireTime`.
 *
 * Any value that converts to a millisecond Unix timestamp via unary `+` is
 * accepted: a number of milliseconds, a numeric string of milliseconds, a
 * `Date`, or any object with a numeric `valueOf()` (for example a moment.js or
 * Luxon instance). Strings must be numeric: date strings such as
 * `'2030-01-01'` are not parsed.
 */
export type ExpireTime = number | `${number}` | Date | { valueOf(): number };

/**
 * Options used to sign a CloudFront URL or generate signed cookies.
 *
 * One of `privateKeyString` or `privateKeyPath` must be provided.
 */
export interface SignatureOptions {
  /**
   * ID of the CloudFront public key (or legacy key pair) that matches the
   * private key used for signing. Sent as `Key-Pair-Id`.
   */
  keypairId: string;
  /**
   * When the signed URL or cookies expire, as a millisecond timestamp (number
   * or numeric string), `Date`, or object with a numeric `valueOf()` such as a
   * moment. Must be in the future and before 2038-01-19.
   *
   * @default 30 minutes from now
   */
  expireTime?: ExpireTime;
  /**
   * Optional IP address or CIDR range (e.g. `192.0.2.0/24`) allowed to access
   * the resource. Added to the policy as `AWS:SourceIp`.
   */
  ipRange?: string;
  /**
   * PEM-encoded RSA private key as a string. Must include line breaks.
   * Ignored when `privateKeyPath` is set.
   */
  privateKeyString?: string;
  /**
   * Path to a PEM-encoded RSA private key file. Takes precedence over
   * `privateKeyString`.
   */
  privateKeyPath?: string;
  /**
   * Passphrase for an encrypted (passphrase-protected) private key. Leave
   * unset for unencrypted keys.
   */
  privateKeyPassphrase?: string;
}

export interface PolicyCondition {
  DateLessThan: {
    'AWS:EpochTime': number;
  };
  IpAddress?: {
    'AWS:SourceIp': string;
  };
}

export interface PolicyStatement {
  Resource: string;
  Condition: PolicyCondition;
}

export interface AwsPolicy {
  Statement: PolicyStatement[];
}
