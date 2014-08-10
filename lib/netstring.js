'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function bufIndexOf(buf, num) {
  for(var i=0; i<buf.length; i++) {
    if(buf[i] == num) return i;
  }
  return -1;
}

function Parser(aString) {
  if(!(this instanceof Parser)) return new Parser(); 
  this.buffer = '';
};
util.inherits(Parser, EventEmitter);

Parser.prototype.processData = function(buf) {
  var self = this;
  if(self.buffer.length == 0) {
    self.buffer = buf;
  } else {
    self.buffer = Buffer.concat([self.buffer, buf], self.buffer.length + buf.length);
  }
  var gotMessage = true;
  while(gotMessage) {
    self.parse(function(err, message) {
      if(err) self.emit('error', err);
      if(message) {
        self.emit('data', message);
      } else {
        gotMessage = false;
      }
    });
  }
};

Parser.prototype.parse = function(callback) {
  var i = bufIndexOf(this.buffer, 58); //look for a colon (char code = 58)
  if(i < 0) {
    // string is too big, or it's not really a netstring
    if(this.buffer.length > 6) return callback(new Error('netstring parsing error (too big)'));
    return callback();;
  }
  var size = parseInt(this.buffer.slice(0,i));

  // length is not really a number
  if(isNaN(size)) return callback(new Error('netstring parsing error (NaN)'));

  // we still need more data
  if(this.buffer.length < (i+size+2)) return callback();

  // netstring is not properly terminated with a comma
  if(this.buffer[i+size+1] != 44) return callback(new Error('netstring parsing error (missing comma)'));

  // answer the string and leave the remainder in the buffer
  var message = this.buffer.slice(i+1,i+size+1);
  this.buffer = this.buffer.slice(i+size+2);
  callback(null, message);
};

function netstring(buf) {
  if(typeof buf == 'string') {
    buf = new Buffer(buf);
  } 
  var strLength = buf.length.toString();
  var answer = new Buffer(strLength.length + 2 + buf.length);
  var offset = 0;
  answer.write(strLength, offset);
  offset += strLength.length;
  answer.write(':', offset);
  offset += 1;
  buf.copy(answer, offset);
  answer.write(',', answer.length - 1);
  return answer;
};

netstring.Parser = Parser;
module.exports = netstring;
