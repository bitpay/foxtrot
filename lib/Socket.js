var util = require('util');
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var preconditions = require('preconditions').singleton();
var SecureRandom = require('bitcore').SecureRandom;
var Message = require('./Message');

var commandsDest = {
  SEND: 'SENDDEST',
  END: 'ENDDEST'
};

var commandsOrig = {
  SEND: 'SENDORIG', 
  END: 'ENDORIG'
};

function Socket(endpoint, request, key) {
  if(!(this instanceof Socket)) return new Socket(endpoint, request, key);
  this.commands = commandsDest;
  this.request = request;
  this.endpoint = endpoint;
  this.key = key;  // AES256 Symmetric Key
  this.transport = null; // the other end
  this.allowHalfOpen = false;
  this.closed = false;
  this.otherEndClosed = false;
};
util.inherits(Socket, EventEmitter);

Socket.prototype.isSocket = function() {return true;};

Object.defineProperty(Socket.prototype, 'connectionId', {
  get: function() {
    return this.request.id;
  }
});

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
  this.otherEndClosed = true;
  if(this.closed && this.otherEndClosed) this.emit('close');
  if(this.allowHalfOpen || this.closed) return;
  this.end();
};
Socket.prototype.endOrigin = Socket.prototype.endDest;

Socket.prototype.write = function(data, encoding, callback) {
  preconditions.checkState(!this.closed, 'This socket is closed');
  if(typeof encoding == 'function') {
    callback = encoding;
    encoding = undefined;
  }
  if(typeof data == 'string') data = new Buffer(data, encoding);
  this.transport.send(Message[this.commands.SEND](this.request.id, this.encrypt(data)), callback);
};

Socket.prototype.end = function(data, encoding) {
  if(data && this.closed) throw new Error('This socket is closed');
  if(this.closed) return;
  if(data) this.write(data, encoding);
  if (this.transport) {
    this.transport.send(Message[this.commands.END](this.request.id));
  }
  this.closed = true;
  if(this.otherEndClosed) this.emit('close');
};

Socket.prototype.pipe = function(writableStream) {
  this.on('data', function(data) {
    writableStream.write(data);
  });
};

Socket.prototype.peerRemoved = function(peer) {
  if(this.closed) return;
  if(this.transport === peer) {
    this.closed = true;
    this.otherEndClosed = true;
    this.endOrigin();
  }
};

Socket.prototype.encrypt = function(message) {
  var iv = SecureRandom.getRandomBuffer(16);
  var cipheriv = crypto.createCipheriv('AES-256-CBC', this.key, iv);
  var a = cipheriv.update(message);
  var b = cipheriv.final();
  return Buffer.concat([iv, a, b], iv.length+a.length+b.length);
};

Socket.prototype.decrypt = function(message) {
  preconditions.checkArgument(message.length !== 0, 'message lenght should be > 0');
  var iv = message.slice(0, 16);
  var decipheriv = crypto.createDecipheriv('AES-256-CBC', this.key, iv);
  var todecrypt = message.slice(16, message.length);
  var a = decipheriv.update(todecrypt);
  var b = decipheriv.final();
  return Buffer.concat([a, b], a.length + b.length);
};

module.exports = Socket;
