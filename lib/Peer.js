var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Message = require('./Message');
var messages = require('./messages');

function Peer(socket, router) {
  if(!(this instanceof Peer)) return new Peer(socket);
  var self = this;
  this.id = null; // 20 byte identity of the peer
  this.version = 0; // 4 byte version number
  this.transport = socket;
  this.remoteAddress = this.getTransportSocket().remoteAddress;
  this.remotePort = this.getTransportSocket().remotePort;
  var parser = Message.Parser();
  parser.on('message', function(message) {
    self.emit('message', message);
  });
  socket.on('data', function(data) {
    parser.processData(data);
  });
  socket.on('error', function(err) {
    self.emit('error', err);
  });
  socket.on('close', function() {
    self.emit('close');
  });
};
util.inherits(Peer, EventEmitter);

for(var k in messages) {
  (function(messageName) {
    Peer.prototype[messageName] = function() {
      var msg = Message[messageName].apply(Message, arguments);
      this.send(msg);
    };
  })(k);
}

Peer.prototype.write = function(data, encoding, callback) {
  this.transport.write(data, encoding, callback);
};

Peer.prototype.send = function(message, callback) {
  this.transport.write(message.toBuffer(), callback);
};

Peer.prototype.end = function() {
  this.transport.end();
  this.emit('close');
};

Peer.prototype.getTransportSocket = function() {
  if(this.transport.getTransportSocket) {
    return this.transport.getTransportSocket();
  } else {
    return this.transport;
  }
};

Peer.prototype.descriptorString = function() {
  return 'host: '+this.remoteAddress+', port: '+this.remotePort;
};

module.exports = Peer;
