var util = require('util');
var EventEmitter = require('events').EventEmitter;

function ServerList() {
  if(!(this instanceof ServerList)) return new ServerList();
  this.servers = [];
};
util.inherits(ServerList, EventEmitter);

ServerList.prototype.add = function(server) {
  var self = this;
  self.servers.push(server);
  server.on('close', function() {
    self.remove(server);
  });
};

ServerList.prototype.remove = function(server) {
  var index = this.server.indexof(server);
  if(index >= 0) {
    this.servers.splice(index, 1);
  }
};

module.exports = ServerList;
