function Router() {
  if(!(this instanceof Router) return new Router();
  this.peers = [];
  this.identities = [];
  this.routes = {};
};

Router.prototype.

Router.prototype.addPeer = function(peer) {
  this.peers.push(peer);
};

module.exports = Router;

