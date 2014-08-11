var ConnectionRequest = require('./ConnectionRequest');

function Connection(id) {
  if(!(this instanceof Connection)) return new Connection(id);
  this.request = ConnectionRequest(id);
  this.origin = null;
  this.destination = null;
};


Connection.prototype.isSocket = function() {return false;};

Connection.prototype.deliverDest = function(data) {
  this.destination.write(data);
};

Connection.prototype.deliverOrigin = function(data) {
  this.origin.write(data);
};

Connection.prototype.endDest = function(data) {
  this.destination.write(data);
};

Connection.prototype.endOrigin = function(data) {
  this.origin.write(data);
};

module.exports = Connection;
