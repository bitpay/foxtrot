var ConnectionRequest = require('./ConnectionRequest');

function Connection(id) {
  if(!(this instanceof Connection)) return new Connection(id);
  this.request = ConnectionRequest(id);
  this.origin = null;
  this.destination = null;
};


Connection.prototype.isSocket = function() {return false;};

Connection.prototype.deliverDest = function(message) {
  this.destination.send(message);
};

Connection.prototype.deliverOrigin = function(message) {
  this.origin.send(message);
};

Connection.prototype.endDest = function(message) {
  this.destination.send(message);
};

Connection.prototype.endOrigin = function(message) {
  this.origin.send(message);
};

module.exports = Connection;
