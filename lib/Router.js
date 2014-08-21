var util = require('util');
var net = require('net');
var bitcore = require('bitcore');
var SecureRandom = bitcore.SecureRandom;
var EventEmitter = require('events').EventEmitter;
var Listener = require('./Listener');
var KeyExchanger = require('./KeyExchanger');
var Socket = require('./Socket');
var ConnectionRequest = require('./ConnectionRequest');
var sha256 = bitcore.util.sha256;
var sha256ripe160 = bitcore.util.sha256ripe160
var ECIES = bitcore.ECIES;
var Msg = bitcore.Message;
var Message = require('./Message');
var Endpoint = require('./Endpoint');
var broker = require('./broker');
var Peer = require('./Peer');

var bitcore = require('bitcore');
var Key = bitcore.Key;

function Router() {
  if(!(this instanceof Router)) return new Router();
  this.peers = [];
  this.listeners = {};
  this.endpoints = [];
  this.connections = {};
};
util.inherits(Router, EventEmitter);

Router.prototype.newKey = function() {
  return Key.generateSync();
};

Router.prototype.createServer = function(options, connectListener) {
  var server = Endpoint(options.key);
  this.endpoints.push(server);
  if(connectListener) server.on('connect', connectListener);
  trace('listening on '+options.key.public.toString('hex'));
  return server;
};

Router.prototype.connect = function(options, connectListener) {
  var origin = options.origin || Endpoint(options.key);
  var request = ConnectionRequest.to(options.address, origin);
  var socket = Socket(origin, request);
  this.connections[request.id] = socket;

  var msg = Message.CONNECT(request.id); 
  if(options.peer) {
    options.peer.send(msg);
  } else {
    var peerList = options.peers || this.peers;
    for(var i=0; i<peerList.length; i++) {
      peerList[i].send(msg);
    }
  }
  
  if(connectListener) socket.on('connect', connectListener);
  return socket;
};

Router.prototype.addPeer = function(peer) {
  var self = this;
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

Router.prototype.removePeer = function(socket) {
  var index = this.peers.indexOf(socket);
  if(index >= 0) this.peers.splice(index, 1);
};

Router.prototype.connectToPeer = function(host, port) {
  var self = this;
  var tcpSocket = net.connect({host: host, port: port}, function() {
    var keyExchanger = KeyExchanger(tcpSocket);
    keyExchanger.clientHandshake(function(err, socket) {
      if(err) {
        trace(err);
      } else {
        self.addPeer(Peer(socket, self));
      }
    });
  });
};

Router.prototype.listenForPeers = function(port) {
  var self = this;
  var listener = Listener(port);
  listener.on('connect', function(socket) {
    self.addPeer(Peer(socket, self));
  });
  self.listeners[port] = listener;
};

Router.prototype.stopListeningForPeers = function(port) {
  if(port) { 
    if(this.listeners[port]) {
      this.listeners[port].close();
      delete this.listeners[port];
    }
    return;
  }
  for(var k in this.listeners) {
    this.listeners[k].close();
  }
  this.listeners = [];
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

function trace() {
  if(!Router.tracer) return;
  Router.tracer.apply(null, arguments);
};

module.exports = Router;
