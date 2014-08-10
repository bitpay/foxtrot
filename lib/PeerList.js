var Router = require('./Router);

function PeerList() {
  if(!(this instanceof PeerList)) return new PeerList();
  this.peers = [];
  this.router = Router();
  this.router.getDefaultRoutes = function() {
    return [this.peers];
  };
};

PeerList.prototype.add = function(peerlink) {
  var self = this;
  self.peers.push(peerlink);
  peerlink.on('close', function() {
    self.remove(peerlink);
  });
};

PeerList.prototype.remove = function(peerlink) {
  var index = this.peers.indexof(peerlink);
  if(index >= 0) {
    this.peers.splice(index, 1);
  }
};

PeerList.prototype.send = function(address, message, options, callback) {
  for(var i=0; i<this.peers.length; i++) {
    this.peers[i].send(address, message, options);
  }
};

module.exports = PeerList;
