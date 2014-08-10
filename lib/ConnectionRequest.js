var bitcore = require('bitcore');
var SecureRandom = bitcore.SecureRandom;
var sha256ripe160 = bitcore.util.sha256ripe160;

function ConnectionRequest(id) {
  if(!(this instanceof ConnectionRequest)) return new ConnectionRequest(id);
  this.id = id;
  this.address = null;
  this.nonce = null;
  this.credentials = null; // encrypted(address+signed(address+nonce));
};

ConnectionRequest.prototype.init = function(address, origin) {
  this.address = address;
  this.nonce = SecureRandom.getRandomBuffer(8);
  this.credentials = origin.credentials(this); 
  var tmp = Buffer.concat([this.address, this.nonce]);
  this.id = sha256ripe160(tmp);
};

ConnectionRequest.to = function(address, origin) {
  var answer = new this();
  answer.init(address, origin);
  return answer;
};

module.exports = ConnectionRequest;
