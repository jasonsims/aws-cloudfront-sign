
var _ = require('lodash');
var util = require('./util');

var DEFAULT_EXPIRATION_SECS = 30;

module.exports = function Policy(url, params) {
  // Validations
  if (!url) {throw new Error('no url')}

  var expireTime = util.parseTime(params.expireTime) ||
                   util.getNow(3000) / 1000;
  var startTime = util.parseTime(params.startTime);
  var ipAddress = params.ipAddress;
  var policy = {
    Statement: [{
      Resource: url,
      Condition: {
        DateLessThan: {'AWS:EpochTime': expireTime}
      }
    }]
  };
  var conditions = policy.Statement[0].Condition;

  // Add optional params if available.
  if (params.startTime) {
    conditions.IpAddress = {'AWS:EpochTime': startTime};
  }
  if (params.ipAddress) {
    conditions.IpAddress = {'AWS:SourceIp': ipAddress};
  }


  return {
    isCanned: function() {
      return (_.isUndefined(params.startTime) &&
              _.isUndefined(params.ipAddress));
    },

    stringify: function() {
      return JSON.stringify(policy);
    },

    getExpireTime: function() {
      return expireTime;
    },
  }
};
