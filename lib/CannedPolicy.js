
/**
 * `CannedPolicy` constructor.
 *
 * @param {String} Resource URL
 * @param {Number} Epoch time of URL expiration
 */
function CannedPolicy(url, expireTime) {
  this.url = url;
  this.expireTime = expireTime;
}

/**
 * Serialize the CannedPolicy instance.
 *
 * @return {String} Serialized policy
 */
CannedPolicy.prototype.toJSON = function() {
  var policy = {
    'Statement':[{
      'Resource': this.url,
      'Condition': {
        'DateLessThan': {
          'AWS:EpochTime': this.expireTime
        }
      }
    }]
  };

  return JSON.stringify(policy);
};


module.exports = CannedPolicy;
