var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var PeerLink = require('./PeerLink');
var Peer = require('./Peer');

function Server(port) {
  if(!(this instanceof Server)) return new Server(port);
  var self = this;

  var server = net.createServer(function(c) {
    self.emit('connect', Peer(c));
  });
  server.on('close', function() {
    if(self.server === server) self.server = null;
    self.emit('close');
  });
  server.on('error', function(err) {
    self.emit('error', err);
  });
  server.listen(port, function() {
    self.emit('listening');
  });

  this.port = port;
  this.server = server;
};
util.inherits(Server, EventEmitter);

Server.prototype.stop = function() {
  if(!this.server) return;
  this.server.close();
};

module.exports = Server;
