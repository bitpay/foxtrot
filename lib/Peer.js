var util = require('util');
var EventEmitter = require('events').EventEmitter;
var PeerLink = require('./PeerLink');
var net = require('net');

function Peer(host, port) {
  if(!(this instanceof Peer)) return new Peer(host, port);
  this.host = host;
  this.port = port;
  this.link = null;
};
util.inherits(Peer, EventEmitter);

Peer.prototype.connect = function() {
  var self = this;
  var client = net.connect({host: this.host, port: this.port}, function() {
    console.log('client connected');
    self.emit('connect'); 
  });
  this.link = PeerLink(client);
  this.link.on('close', function() {
    self.emit('close');
  });
};

module.exports = Peer;
