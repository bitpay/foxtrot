var util = require('util');
var EventEmitter = require('events').EventEmitter;

function PeerLink(socket) {
  if(!(this instanceof PeerLink)) return new PeerLink(socket);
  var self = this;
  this.socket = socket;
  socket.on('error', function(err) {self.emit('error', err);});
  socket.on('end', function() {self.emit('end');});
  socket.on('data', function(data) {
    self.emit('message', data);
  });
};
util.inherits(PeerLink, EventEmitter);

PeerLink.prototype.send = function(address, message, options) {
  this.socket.write(message);
};

module.exports = PeerLink;
