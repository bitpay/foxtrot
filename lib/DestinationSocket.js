var net = require('net');
var bitcore = require('bitcore');
var sha256ripe160 = bitcore.util.sha256ripe160;
var SecureRandom = bitcore.SecureRandom;

var S_REQUEST = 'request';

function DestinationSocket(id) {
  if(!(this instanceof DestinationSocket)) return new DestinationSocket(id);
  this.id = id;
  this.key = null; // private key
  this.pubkey = null; // destination public key
  this.nonce = null; // session nonce
  this.credentials = null; // encrypted(origin_pubkey+signed(id))
  this.origin = null; // origin link level sockets 
};

DestinationSocket.prototype.init = function(pubkey) {
  this.pubkey = pubkey;
  this.nonce = SecureRandom.getRandomBuffer(8);
  var tmp = Buffer.concat([this.pubkey, this.nonce], this.pubkey.length + 8);
  this.id = sha256ripe160(tmp);
console.log('created session pubkey: '+this.pubkey.toString('hex')+', nonce: '+this.nonce.toString('hex')+', id: '+this.id.toString('hex'));
};

DestinationSocket.prototype.write = function(data) {
  this.origin.write(data);
};

module.exports = DestinationSocket;
