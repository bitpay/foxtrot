'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var sha256 = require('bitcore').util.sha256;

function Parser(aString) {
  if(!(this instanceof Parser)) return new Parser(); 
  this.buffer = '';
  this.mtu = 1000000; // default to 1mb for mtu
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
  if(this.buffer.length < 8) return callback();
  var len = this.buffer.readUInt32LE(0);
  if(len > this.mtu) return callback(new Error('packet size exceeds mtu'));
  if(this.buffer.length < (len + 8)) return callback();
  var payload = this.buffer.slice(8, len + 8);
  var advertisedSha = this.buffer.readUInt32LE(4);
  var computedSha = sha256(sha256(payload)).readUInt32LE(0);
  if(advertisedSha != computedSha) return callback(new Error('parsing error (invalid checksum)'));
  this.buffer = this.buffer.slice(len + 8);
  return callback(null, payload);
};

function shastring(buf) {
  var answer = new Buffer(buf.length + 8);
  var offset = 0;
  answer.writeUInt32LE(buf.length, 0);
  sha256(sha256(buf)).copy(answer, 4, 0, 4);
  buf.copy(answer, 8);
  return answer;
};

shastring.parse = function(buf) {
  var parser = new Parser();
  parser.buffer = buf;
  return parser.parse(function(err, result) {
    if(err) throw err;
    if(!result) return null;
    return result;
  });
};

shastring.Parser = Parser;
module.exports = shastring;
