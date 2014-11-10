var util = require('util');
var bitcore = require('bitcore');
var EventEmitter = require('events').EventEmitter;
var Socket = require('./Socket');
var ConnectionRequest = require('./ConnectionRequest');
var sha256ripe160 = bitcore.util.sha256ripe160
var base58encode = require('bitcore').Base58.base58.encode;
var Message = require('./Message');
var Endpoint = require('./Endpoint');
var broker = require('./broker');
var tcpconnect = require('./discovery/connect');
var Key = bitcore.Key;

var defaultOptions = {
  discovery: {
    connect: [],
    tcpserver: {
      port: 9333,
      seek: true
    },
    file: {},
    dnsseed: {},
    zeroconf: {
      discover: true,
      advertise: true,
    },
    rumor: {},
    reconnect: {},
  }
};

function Router(options) {
  if(!(this instanceof Router)) return new Router(options);
  options = options || defaultOptions;
  this.key = Key.generateSync();
  this.peers = [];
  this.listeners = {};
  this.endpoints = [];
  this.connections = {};
  this.discoveryModules = [];
  this.startDiscovery(options.discovery);
  this._id = null;
};
util.inherits(Router, EventEmitter);
Router.defaultOptions = defaultOptions;

Router.prototype.id = function() {
  if(!this._id) {
    this._id = base58encode(sha256ripe160(this.key.public));
  } 
  return this._id;
};

Router.prototype.startDiscovery = function(options) {
  for(var k in options) {
    var discoveryModule = require('./discovery/'+k);
    discoveryModule.start(this, options[k]);
    this.discoveryModules.push(discoveryModule);
  }
};

Router.prototype.newKey = function() {
  return Key.generateSync();
};

Router.prototype.createServer = function(options, connectListener) {
  options = options || {};
  options.key = options.key || Key.generateSync();
  var server = Endpoint(options.key);
  this.endpoints.push(server);
  if(connectListener) server.on('connect', connectListener);
  trace('listening on '+options.key.public.toString('hex'));
  return server;
};

Router.prototype.connect = function(options, connectListener) {
  var self = this;
  var origin = options.origin || Endpoint(options.key);
  var request = ConnectionRequest.to(options.address, origin);
  var socket = Socket(origin, request);
  this.connections[request.id] = socket;

  var msg = Message.CONNECT(request.id);
  var announceToPeer = function(peer) {
    peer.send(msg);
  };
  this.on('peerConnect', announceToPeer);

  if(options.peer) {
    announceToPeer(options.peer);
  } else {
    var peerList = options.peers || this.peers;
    for(var i=0; i<peerList.length; i++) {
      announceToPeer(peerList[i]);
    }
  }
  var emitTimeout = function() {
    self.removeListener('peerConnect', announceToPeer);
    socket.emit('error', new Error('timeout'));
    socket.emit('close');
  };
  var timer = setTimeout(emitTimeout, 3000);
  var clearTimer = function() {
    clearTimeout(timer);
    self.removeListener('peerConnect', announceToPeer);
    socket.removeListener('connect', clearTimer);
  };
  socket.on('connect', clearTimer);
  if (connectListener) {
    socket.on('connect', connectListener);
  }
  return socket;
};

Router.prototype.addPeer = function(peer) {
  var self = this;
  //note: this check could be made more efficient ...also, there can
  //be a race condition...imagine two peers both trying to connect to
  //each other at nearly the same time ...one peer could elect to ignore
  //on connection while the other peer ignores the other one
  if(peer.id) {
    for(var i=0; i<self.peers.length; i++) {
      var eachPeer = self.peers[i];
      if(eachPeer.id && (peer.id.toString() == eachPeer.id.toString())) {
        peer.end();
        return;
      }
    }
  }
  self.peers.push(peer);
  peer.on('message', function(message) {
    var connection;
    if(message.connectionId)
        connection = self.connections[message.connectionId];
    broker[message.name](self, peer, message, connection);
  });
  peer.on('close', function() {
    self.removePeer(peer);
  });
  self.emit('peerConnect', peer);
};

Router.prototype.removePeer = function(peer) {
  var index = this.peers.indexOf(peer);
  if(index >= 0) {
    this.peers.splice(index, 1);
    peer.end();
    for(var k in this.connections) {
      var conn = this.connections[k];
      conn.peerRemoved(peer);
    }
    this.emit('peerDisconnect', peer);
  }
};

Router.prototype.removeAllPeers = function() {
  var peers = this.peers.slice(0);
  for(var i=0; i<peers.length; i++) {
    this.removePeer(peers[i]);
  }
};

Router.prototype.stopDiscovery = function() {
  for(var i=0; i<this.discoveryModules.length; i++) {
    var dm = this.discoveryModules[i];
    dm.stop();
  }
};

Router.prototype.stop = function() {
  this.stopDiscovery();
  this.removeAllPeers();
};

Router.prototype.addConnection = function(connection) {
  var self = this;
  this.connections[connection.connectionId] = connection;
  connection.on('close', function() {
    delete self.connections[connection.connectionId];
    self.emit('connectionClose', connection);
  });
};

Router.prototype.getConnection = function(connectionId, factory) {
  var answer = this.connections[connectionId];
  if(!answer && factory) {
    answer = factory();
    this.connections[connectionId] = answer;
  }
  return answer;
};

Router.prototype.setupPeering = function(serverPort, peerIPAddresses, log) {
  var addresses = [];
  var os=require('os');
  var ifaces=os.networkInterfaces();
  for(var dev in ifaces) {
    ifaces[dev].forEach(function(details){
      if(details.family=='IPv4') addresses.push(details.address);
    });
  }

  function writeListeners(port) {
    var str = '';
    var first = true;
    for(var i=0; i<addresses.length; i++) {
      if(!first) str += ', ';
      first = false;
      str += addresses[i];
      str += ':';
      str += port;
    }
    return str;
  };

  // setup foxtrot node
  if(serverPort) this.listenForPeers(serverPort);
  if(log) {
    this.on('peerConnect', function(peer) {
      var tsock = peer.getTransportSocket();;
      log('peer connected (local: '+tsock.localAddress+':'+tsock.localPort+', remote: '+tsock.remoteAddress+':'+tsock.remotePort+')');
    });

    if(serverPort) {
      var str = 'listening for foxtrot peers on: ';
      str += writeListeners(serverPort);
      log(str);
    }
  }

  for(var i=0; i<peerIPAddresses.length; i++) {
    var host = '127.0.0.1';
    var port = peerIPAddresses[i];
    var indexOfColon = port.indexOf(':');
    if(indexOfColon >= 0) {
      host = port.split(':')[0];
      port = port.split(':')[1];
    }
    this.connectToPeer(host, port);
  }
};

Router.prototype.connectToPeer = function(options) {
  tcpconnect(this, options);
};

Router.noDiscovery = function() {
  return new Router({discovery: {}});
};

function trace() {
  if(!Router.tracer) return;
  Router.tracer.apply(null, arguments);
};

module.exports = Router;
