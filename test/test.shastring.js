var should = require('chai').should();
var shastring = require('../lib/shastring');

describe('shastring', function() {

  beforeEach(function() {
  });
  it('should encode and decode a string', function() {
    var str = 'this is a test';
    var encodedStr = shastring(new Buffer(str));
    encodedStr.length.should.equal(str.length + 8);
    var decodedStr = shastring.parse(encodedStr);
    decodedStr.toString().should.equal(str);
  });
  it('should handle multiple sequential encodings', function(testDone) {
    var str1 = 'this is string1';
    var str2 = 'this is string2';
    var encodedStr1 = shastring(new Buffer(str1));
    var encodedStr2 = shastring(new Buffer(str2));
    var parser = shastring.Parser();
    var expecting = str1;
    parser.on('data', function(data) {
      data.toString().should.equal(expecting);
      if(expecting == str2) testDone();
      expecting = str2;
    });
    parser.processData(Buffer.concat([encodedStr1, encodedStr2]));
  });
  it('should handle multiple sequential encodings with misaligned chunks', function(testDone) {
    var str1 = 'this is string1';
    var str2 = 'this is string2';
    var encodedStr1 = shastring(new Buffer(str1));
    var encodedStr2 = shastring(new Buffer(str2));
    var parser = shastring.Parser();
    var expecting = str1;
    parser.on('data', function(data) {
      data.toString().should.equal(expecting);
      if(expecting == str2) testDone();
      expecting = str2;
    });
    parser.processData(encodedStr1.slice(0,10));
    parser.processData(Buffer.concat([encodedStr1.slice(10), encodedStr2.slice(0,6)]));
    parser.processData(encodedStr2.slice(6));
  });
});
