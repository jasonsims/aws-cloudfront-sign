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
CannedPolicy.prototype.toJSON = function () {
    if (this._validate())
        var policy = {
            'Statement': [{
                'Resource': this.url,
                'Condition': {
                    'DateLessThan': {
                        'AWS:EpochTime': Math.round(this.expireTime.getTime() / 1000)
                    }
                }
            }]
        };

    return JSON.stringify(policy);
};

/**
 * Check for common mistakes with types
 * @private
 */
CannedPolicy.prototype._validate = function () {
    if (typeof this.expireTime == 'undefined' || this.expireTime instanceof Date == false)
        throw new Error("expireTime must be a JavaScript Date!");
    if (this.expireTime.getTime() / 1000 > 2147483647)
        throw new Error("expireTime must be less than January 19, 2038 03:14:08 GMT due to the limits of UNIX time.");
    if (this.expireTime <= new Date())
        throw new Error("expireTime is below the current time.");
    return true;
};


module.exports = CannedPolicy;
