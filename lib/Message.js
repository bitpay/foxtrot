var util = require('util');
var EventEmitter = require('events').EventEmitter;
var bitcore = require('bitcore');
var varStrBuf = bitcore.util.varStrBuf;

// note, this constructor is likely very hard for 
// v8 to optimize (because we set different properties
// based on the message type) ...nonetheless, in case
// v8 might be able to make sense of it, we set the properties
// that will be needed to null ...it is possible that v8 is
// smart enought to keep a set of shadow classes based on the
// handful of different property sets it sees...this might be a
// candidate for later optimization

function Message(name) {
  if(!(this instanceof Message)) return new Message(name);
  this.name = name;
  var args = messages[name].args;
  for(var i=0; i<args.length; i++) {
    this[args[i].name] = null;
  }
};

var messages = {
  CONNECT: {id: 0,
    args: [
      {name: 'connectionId', size: 20}]},
  GETCONNECTINFO: {id: 1,
    args: [
      {name: 'connectionId', size: 20}]},
  CONNECTINFO: {id: 2,
    args: [
      {name: 'address', size: 33},
      {name: 'nonce', size: 8},
      {name: 'credentials', type: 'varbuf'}]},
  CONNECTACK: {id: 3,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'signature', type: 'varbuf'},
      {name: 'preMaster', type: 'varbuf'}]},
  CONNECTED: {id: 4,
    args: [
      {name: 'connectionId', size: 20}]},
  SENDDEST: {id: 5,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'data', type: 'varbuf'}]},
  SENDORIG: {id: 6,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'data', type: 'varbuf'}]},
  ENDDEST: {id: 7,
    args: [
      {name: 'connectionId', size: 20}]},
  ENDORIG: {id: 8,
    args: [
      {name: 'connectionId', size: 20}]}
};

var messageIdLookup = new Array(Object.keys(messages).length);
for(var k in messages) {
  messages[k].name = k;
  messageIdLookup[messages[k].id] = messages[k];
  (function(name, spec) {
    Message[name] = function() {
      var answer = new Message(name);
      for(var i=0; i<spec.args.length; i++) {
        answer[spec.args[i].name] = arguments[i];
      }
      return answer;
    };
  })(k, messages[k]);
}

function varIntBuf(n) {
  var buf;
  if (n < 253) {
    buf = new Buffer(1);
    buf.writeUInt8(n, 0);
  } else if (n < 0x10000) {
    buf = new Buffer(3);
    buf.writeUInt8(253, 0);
    buf.writeUInt16LE(n, 1);
  } else if (n < 0x100000000) {
    buf = new Buffer(5);
    buf.writeUInt8(254, 0);
    buf.writeUInt32LE(n, 1);
  } else {
    buf = new Buffer(9);
    buf.writeUInt8(255, 0);
    buf.writeInt32LE(n & -1, 1);
    buf.writeUInt32LE(Math.floor(n / 0x100000000), 5);
  }
  return buf;
};

Message.prototype.toBuffer = function() {
  var spec = messages[this.name];
  var bufs = [];
  var idbuf = new Buffer(1);
  idbuf.writeUInt8(spec.id, 0);
  bufs.push(idbuf);
  for(var i=0; i<spec.args.length; i++) {
    var argSpec = spec.args[i];
    if(!argSpec.type && argSpec.size) {
      if(argSpec.size != this[argSpec.name].length) {
        throw new Error('invalid message');
      }
      bufs.push(this[argSpec.name]);
    } else if(argSpec.type == 'varbuf') {
      bufs.push(varIntBuf(this[argSpec.name].length));
      bufs.push(this[argSpec.name]);
    } else {
      throw new Error('invalid message');
    }
  }
  return Buffer.concat(bufs);
};

// might want to separate this out into it's own
// file later (if it's needed elsewhere)
function ReadStream(buffer, position) {
  if(!(this instanceof ReadStream)) return new ReadStream(buffer, position);
  this.buffer = buffer;
  this.position = position;
};

var endOfStream = 'END OF STREAM';

ReadStream.prototype.check = function(count) {
  if((this.position + count) > this.buffer.length) throw endOfStream;
};

ReadStream.prototype.next = function(count) {
  this.check(count);
  var answer = this.buffer.slice(this.position, this.position + count);
  this.position = this.position + count;
  return answer;
};

ReadStream.prototype.readUInt8 = function() {
  this.check(1);
  var answer = this.buffer[this.position];
  this.position++;
  return answer;
};

ReadStream.prototype.readUInt16LE = function() {
  this.check(2);
  var answer = this.buffer.readUInt16LE(this.position);
  this.position += 2;
};

ReadStream.prototype.readUInt32LE = function() {
  this.check(4);
  var answer = this.buffer.readUInt32LE(this.position);
  this.position += 4;
};

ReadStream.prototype.readUInt64LE = function() {
  this.check(8);
  var low = this.buffer.readUInt32LE(this.position);
  var high = this.buffer.readUInt32LE(this.position+4) * 0x100000000;
  var answer = low + high;
  this.position += 8;
  return answer;
};

ReadStream.prototype.readVarInt = function() {
  var firstByte = this.readUInt8();
  switch (firstByte) {
    case 0xFD:
      return this.readUInt16LE();
    case 0xFE:
      return this.readUInt32LE();
    case 0xFF:
      return this.readUInt64LE();
    default:
      return firstByte;
  }
};

ReadStream.prototype.readVarBuf = function() {
  return this.next(this.readVarInt());
};

function Parser() {
  if(!(this instanceof Parser)) return new Parser();
  this.buffer = null;
};
util.inherits(Parser, EventEmitter);

Parser.prototype.processData = function(data) {
  var self = this;
  if((!self.buffer) || (self.buffer.length == 0)) {
    self.buffer = data;
  } else {
    self.buffer = Buffer.concat([self.buffer, data], self.buffer.length + data.length);
  }
  var gotMessage = true;
  while(gotMessage) {
    self.parse(function(err, message) {
      if(err) self.emit('error', err);
      if(message) {
        self.emit('message', message);
      } else {
        gotMessage = false;
      }
    });
  }
};

Parser.prototype.parse = function(callback) {
  if(this.buffer.length == 0) return callback();
  var spec = messageIdLookup[this.buffer.readUInt8(0)];
  if(!spec) {
    return callback(new Error('invalid message'));
  }
  var message = new Message(spec.name);
  var strm = ReadStream(this.buffer, 1);
  try {
    for(var i=0; i<spec.args.length; i++) {
      var argSpec = spec.args[i];
      if(!argSpec.typei && argSpec.size) {
        message[argSpec.name] = strm.next(argSpec.size);
      } else if(argSpec.type == 'varbuf') {
        message[argSpec.name] = strm.readVarBuf();
      } else {
        return callback(new Error('invalid argument type'));
      }
    }
  } catch(e) {
console.log('got error = '+e);
console.log(e.stack);
    if(e === endOfStream) return callback();
    return callback(e);
  }
  this.buffer = this.buffer.slice(strm.position);
  return callback(null, message);   
};

Message.parse = function(buf) {
  var parser = new Parser();
  parser.buffer = buf;
  return parser.parse(function(err, result) {
    if(err) throw err;
    if(!result) return null;
    return result;
  });
};

Message.Parser = Parser;
module.exports = Message;
