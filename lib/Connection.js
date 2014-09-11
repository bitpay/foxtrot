var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ConnectionRequest = require('./ConnectionRequest');
var Message = require('./Message');

function Connection(id) {
  if(!(this instanceof Connection)) return new Connection(id);
  this.request = ConnectionRequest(id);
  this.origin = null;
  this.destination = null;
  this.originClosed = false;
  this.destClosed = false;
};
util.inherits(Connection, EventEmitter);

Connection.prototype.isSocket = function() {return false;};

Object.defineProperty(Connection.prototype, 'connectionId', {
  get: function() {
    return this.request.id;
  }
});

Connection.prototype.deliverDest = function(message) {
  this.destination.send(message);
};

Connection.prototype.deliverOrigin = function(message) {
  this.origin.send(message);
};

Connection.prototype.endDest = function(message) {
  this.originClosed = true;
  if(this.destClosed) {
    this.emit('close');
  } else {
    this.destination && this.destination.send(message);
  }
};

Connection.prototype.endOrigin = function(message) {
  this.destClosed = true;
  if(this.originClosed) {
    this.emit('close');
  } else {
    this.origin && this.origin.send(message);
  }
};

Connection.prototype.peerRemoved = function(peer) {
  if(this.origin === peer) {
    if(!this.originClosed) 
      this.endDest(Message['ENDDEST'](this.request.id));
    return;
  }
  if(this.destination === peer) {
    if(!this.destClosed) 
      this.endOrigin(Message['ENDORIG'](this.request.id));
    return;
  }
};

module.exports = Connection;
