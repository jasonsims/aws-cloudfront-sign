import { assert } from './utils';
import { AwsPolicy } from './types';

export default class CannedPolicy {
  url: string;
  expireTime: number;
  ipRange: string;

  constructor (url: string, expireTime: number, ipRange?: string) {
    this.url = url;
    this.expireTime = Math.round(expireTime / 1000) || undefined;
    this.ipRange = ipRange;
  }

  /**
   * Serialize the CannedPolicy instance.
   */
  toJSON (): string {
    // Ensure the current instance is valid before building the canned policy.
    this.#validate();

    const policy: AwsPolicy = {
      Statement: [{
        Resource: this.url,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': this.expireTime
          }
        }
      }]
    };

    if (this.ipRange) {
      policy.Statement[0].Condition.IpAddress = {
        'AWS:SourceIp': this.ipRange
      };
    }

    return JSON.stringify(policy);
  }

  /**
   * Check for common mistakes with types
   * @private
   */
  #validate () {
    // Ensure required params are present
    assert(!!this.url, 'Missing param: url');
    assert(!!this.expireTime, 'Missing param: expireTime');

    // Ensure expireTime value is valid
    assert(this.expireTime < 2147483647,
      'expireTime must be less than January 19, 2038 03:14:08 GMT ' +
      'due to the limits of UNIX time');
    assert(this.expireTime > (new Date().getTime() / 1000),
      'expireTime must be after the current time');

    return true;
  }
}
