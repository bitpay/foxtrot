var util = require('util');
var EventEmitter = require('events').EventEmitter;

var bitcore = require('bitcore');
var Key = bitcore.Key;
var ECIES = bitcore.ECIES;
var Message = bitcore.Message;

function Endpoint(key) {
  if(!(this instanceof Endpoint)) return new Endpoint(key);
  this.key = key || Key.generateSync();
};
util.inherits(Endpoint, EventEmitter);

Endpoint.prototype.credentials = function(request) {
  var signature = Message.sign(Buffer.concat([request.address, request.nonce]), this.key);
  var msg = Buffer.concat([this.key.public, signature]);
  return ECIES.encrypt(request.address, msg);
};

Endpoint.prototype.isMatch = function(pubkey) {
  return this.key.public.toString() == pubkey.toString();
};

module.exports = Endpoint;
