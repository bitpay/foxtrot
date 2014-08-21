var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Message = require('./Message');
var messages = require('./messages');

function Peer(socket, router) {
  if(!(this instanceof Peer)) return new Peer(socket);
  var self = this;
  this.transport = socket;
  var parser = Message.Parser();
  parser.on('message', function(message) {
    self.emit('message', message);
  });
  socket.on('data', function(data) {
    parser.processData(data);
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

Peer.prototype.getTransportSocket = function() {
  if(this.transport.getTransportSocket) {
    return this.transport.getTransportSocket();
  } else {
    return this.transport;
  }
};

module.exports = Peer;
