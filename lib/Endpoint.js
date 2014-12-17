var util = require('util');
var EventEmitter = require('events').EventEmitter;

var bitcore = require('bitcore');
var PrivateKey = bitcore.PrivateKey;
var ECIES = require('bitcore-ecies');
var Message = bitcore.Message;

function Endpoint(key) {
  if(!(this instanceof Endpoint)) return new Endpoint(key);
  this.key = key || new PrivateKey();
};
util.inherits(Endpoint, EventEmitter);

Endpoint.prototype.credentials = function(request) {
  var signature = Message.sign(Buffer.concat([request.address, request.nonce]), this.key);
  var msg = Buffer.concat([this.key.publicKey, signature]);
  return ECIES.encrypt(request.address, msg);
};

Endpoint.prototype.isMatch = function(pubkey) {
  return this.key.publicKey.toString() == pubkey.toString();
};

module.exports = Endpoint;
