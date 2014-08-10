var util = require('util');
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var bitcore = require('bitcore');
var SecureRandom = bitcore.SecureRandom;

var CMD_SENDDEST = new Buffer(1);
CMD_SENDDEST.writeUInt8(5, 0);

var CMD_SENDORIG = new Buffer(1);
CMD_SENDORIG.writeUInt8(6, 0);

function Socket(endpoint, request, key) {
  if(!(this instanceof Socket)) return new Socket(endpoint, request, key);
  this.sendCommand = CMD_SENDDEST;
  this.request = request;
  this.endpoint = endpoint;
  this.key = key;  // AES256 Symmetric Key
  this.transport = null; // the other end
};
util.inherits(Socket, EventEmitter);

Socket.prototype.isSocket = function() {return true;};

Socket.prototype.beOrigin = function() {
  this.sendCommand = CMD_SENDDEST;
};

Socket.prototype.beDestination = function() {
  this.sendCommand = CMD_SENDORIG;
};

Socket.prototype.deliverDest = function(data) {
  this.emit('data', this.decrypt(data.slice(21)));
};
Socket.prototype.deliverOrigin = Socket.prototype.deliverDest;

Socket.prototype.write = function(data) {
  this.transport.write(Buffer.concat([this.sendCommand, this.request.id, this.encrypt(data)]));
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
