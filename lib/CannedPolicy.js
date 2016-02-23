/**
 * `CannedPolicy` constructor.
 *
 * @param {String} Resource URL
 * @param {Number} Epoch time of URL expiration
 * @param {String} IP Address/range to allow in this request
 */
function CannedPolicy(url, expireTime, ipRange) {
  this.url = url;
  this.expireTime = Math.round(expireTime/ 1000) || undefined;
  this.ipRange = ipRange;
}

/**
 * Serialize the CannedPolicy instance.
 *
 * @return {String} Serialized policy
 */
CannedPolicy.prototype.toJSON = function() {
  // Ensure the current instance is valid before building the canned policy.
  this._validate();

  var policy = {
    'Statement': [{
      'Resource': this.url,
      'Condition': {
        'DateLessThan': {
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
};

/**
 * Check for common mistakes with types
 * @private
 */
CannedPolicy.prototype._validate = function() {
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
};


/**
 * Assert that an expression evaluates to `true`
 */
function assert(assertion, msg) {
  if (!assertion) {
    throw new Error(msg);
  }
}


module.exports = CannedPolicy;
