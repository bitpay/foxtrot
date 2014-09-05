var util = require('util');
var EventEmitter = require('events').EventEmitter;

var net = require('net');
var KeyExchanger = require('../KeyExchanger');
var Peer = require('../Peer');

function TcpServer(options) {
  if(!(this instanceof TcpServer)) return new TcpServer(options);
  this.server = null;
  this.port = options.port || 9333;
  this.seek = options.seek || false;
  this.listen();
};
util.inherits(TcpServer, EventEmitter);

TcpServer.prototype.listen = function() {
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
    self.emit('close');
  });
  server.on('error', function(err) {
    if(err.code == 'EADDRINUSE') {
      self.server == null;
      self.port++;
      self.listen();
      return;
    }
    self.emit('error', err);
  });
  server.listen(self.port, function() {
    self.emit('listening');
    TcpServer.emit('listening', self);
  });

  this.server = server;
};

TcpServer.prototype.stop = function() {
  if(!this.server) return;
  this.server.close();
};

TcpServer.listeners = {};

TcpServer.start = function(router, options) {
  var self = this;
  var timer;
  var listener = TcpServer(options);
  listener.on('connect', function(socket) {
    var peer = Peer(socket, self);
    handler = function(message) {
      if(message.name == 'VERSION') {
        peer.version = message.version;
        peer.id = message.identity;
        peer.VERACK();
      }
      if(message.name == 'VERACK') {
        clearTimeout(timer);
        peer.removeListener('message', handler);
        router.addPeer(peer);
      }
    };
    timer = setTimeout(function() {
      peer.removeListener('message', handler);
    }, 3000);
    peer.on('message', handler);
    peer.VERSION(new Buffer(4), new Buffer('foo'), new Buffer(20), new Buffer(8), new Buffer(8), new Buffer(8), new Buffer(26), new Buffer(26));
  });
  this.listeners[options.port] = listener;
};

TcpServer.stop = function(port) {
  if(port) {
    if(this.listeners[port]) {
      this.listeners[port].stop();
      delete this.listeners[port];
    }
    return;
  }
  for(var k in this.listeners) {
    this.listeners[k].stop();
  }
  this.listeners = [];
};

var handlers = {};
TcpServer.on = function(event, callback) {
  handlers[event] = handlers[event] || [];
  handlers[event].push(callback);
};

TcpServer.emit = function() {
  var event = arguments[0];
  arguments[0] = undefined;
  if(!handlers[event]) return;
  var args = arguments;
  handlers[event].forEach(function(callback) {
    callback.apply(undefined, Array.prototype.slice.call(args, 1));
  });
};

function trace() {
  if(!TcpServer.tracer) return;
  TcpServer.tracer.apply(null, arguments);
};

module.exports = TcpServer;
