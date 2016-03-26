
var util = require('../src/util');

describe('Util', function() {

  describe('.parseTime()', function() {
    it('should parse time as a string');
    it('should parse time as a number');
    it('should parse time as a moment');
    it('should parse time as a Date');
  });

  describe('.getNow()', function() {
    it('should return now');

    describe('with future time', function() {
      it('should return time in future from now');
    });
    describe('with "sec" unit', function() {
      it('should return time in seconds')
    });

  });
});


// .parseTime() with now value
// .parseTime() with number value
// .parseTime() with string value
// .parseTime() with moment value
// .parseTime() with Date value
// .parseTime() with invalid value

// .getNow()
// .getNow() with future time
// .getNow() with "sec" unit
