var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Address = require('bitcore').Address;

function FTServer(options) {
  if(!(this instanceof FTServer)) return new FTServer(options);
  this.key = options && options.key;
};
util.inherits(FTServer, EventEmitter);

FTServer.prototype.isMatch = function(pubkey) {
console.log('comparing '+this.key.public.toString('hex')+' with '+pubkey.toString('hex'));
  return this.key.public.toString() == pubkey.toString();
};

Object.defineProperty(FTServer.prototype, 'address', {
  get: function() {
    return Address.fromPubKey(this.key.public).toString();
  }
});

//FTServer.prototype.

module.exports = FTServer;
