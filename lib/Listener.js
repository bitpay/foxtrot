var util = require('util');
var EventEmitter = require('events').EventEmitter;

var net = require('net');
var KeyExchanger = require('./KeyExchanger');

function Listener(port) {
  if(!(this instanceof Listener)) return new Listener(port);
  this.server = null;
  if(port) this.listen(port);
};
util.inherits(Listener, EventEmitter);

Listener.prototype.listen = function(port) {
  var self = this;
  var server = net.createServer(function(client) {
    var keyExchanger = KeyExchanger(client);
    keyExchanger.serverHandshake(function(err, socket) {
      if(err) {
        trace(err);
      } else {
        trace('handshake success (svr)');
        self.emit('connect', socket);
      }
    });
  });
  server.on('close', function() {
    if(self.server === server) self.server = null;
    //self.emit('close');
  });
  server.on('error', function(err) {
    trace(err);
    //self.emit('error', err);
  });
  server.listen(port, function() {
    trace('listening');
    // self.emit('listening');
  });

  this.server = server;
};

Listener.prototype.stop = function() {
  if(!this.server) return;
  this.server.close();
};

function trace() {
  if(!Listener.tracer) return;
  Listener.tracer.apply(null, arguments);
};

module.exports = Listener;
