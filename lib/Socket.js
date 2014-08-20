var util = require('util');
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var bitcore = require('bitcore');
var SecureRandom = bitcore.SecureRandom;

var commandBuffers = [];
for(var i=5; i<9; i++) {
  var cmd = new Buffer(1);
  cmd.writeUInt8(i, 0);
  commandBuffers.push(cmd);
}

var commandsDest = {
  SEND: commandBuffers[0],
  END: commandBuffers[2]
};

var commandsOrig = {
  SEND: commandBuffers[1], 
  END: commandBuffers[3]
};

function Socket(endpoint, request, key) {
  if(!(this instanceof Socket)) return new Socket(endpoint, request, key);
  this.commands = commandsDest;
  this.request = request;
  this.endpoint = endpoint;
  this.key = key;  // AES256 Symmetric Key
  this.transport = null; // the other end
};
util.inherits(Socket, EventEmitter);

Socket.prototype.isSocket = function() {return true;};

Socket.prototype.beOrigin = function() {
  this.commands = commandsDest;
};

Socket.prototype.beDestination = function() {
  this.commands = commandsOrig;
};

Socket.prototype.deliverDest = function(message) {
  this.emit('data', this.decrypt(message.data));
};
Socket.prototype.deliverOrigin = Socket.prototype.deliverDest;

Socket.prototype.endDest = function() {
  this.emit('end');
};
Socket.prototype.endOrigin = Socket.prototype.endDest;

Socket.prototype.write = function(data, encoding, callback) {
  this.transport.write(Buffer.concat([this.commands.SEND, this.request.id, this.encrypt(data)]));
};

Socket.prototype.end = function(data, encoding) {
  if(data) this.write(data, encoding);
  if(this.commands) {
    var msg = Buffer.concat([this.commands.END, this.request.id]);
    this.commands = null; // use this to indicate our end is closed
    this.transport.write(msg);
  }
};

Socket.prototype.pipe = function(writableStream) {
  this.on('data', function(data) {
    writableStream.write(data);
  });
};

Socket.prototype.encrypt = function(message) {
  var iv = SecureRandom.getRandomBuffer(16);
  var cipheriv = crypto.createCipheriv('AES-256-CBC', this.key, iv);
  var a = cipheriv.update(message);
  var b = cipheriv.final();
  return Buffer.concat([iv, a, b], iv.length+a.length+b.length);
};

Socket.prototype.decrypt = function(message) {
  var iv = message.slice(0, 16);
  var decipheriv = crypto.createDecipheriv('AES-256-CBC', this.key, iv);
  var todecrypt = message.slice(16, message.length);
  var a = decipheriv.update(todecrypt);
  var b = decipheriv.final();
  return Buffer.concat([a, b], a.length + b.length);
};

module.exports = Socket;
