
module.exports = {
  parseTime: function() {
    return Date.now();
  },

  getNow: function(plusTime, unit) {
    var now = Date.now();
    now = (_.isUndefined(plusTime)) ? now : now + plusTime;
    now = (unit === 'sec') ? now / 1000 : now;

    return now;
  }
};
