var util = require('util');
var net = require('net');
var bitcore = require('bitcore');
var SecureRandom = bitcore.SecureRandom;
var EventEmitter = require('events').EventEmitter;
var Listener = require('./Listener');
var KeyExchanger = require('./KeyExchanger');
var Socket = require('./Socket');
var Connection = require('./Connection');
var ConnectionRequest = require('./ConnectionRequest');
var sha256 = bitcore.util.sha256;
var sha256ripe160 = bitcore.util.sha256ripe160
var ECIES = bitcore.ECIES;
var Msg = bitcore.Message;
var Message = require('./Message');
var Endpoint = require('./Endpoint');
var messageHandlers = require('./broker');

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

  var msg = Message.CONNECT(request.id).toBuffer(); 
  if(options.peer) {
    options.peer.write(msg);
  } else {
    var peerList = options.peers || this.peers;
    for(var i=0; i<peerList.length; i++) {
      peerList[i].write(msg);
    }
  }
  
  if(connectListener) socket.on('connect', connectListener);
  return socket;
};

Router.prototype.addPeer = function(socket) {
  var self = this;
  var messageParser = Message.Parser();
  messageParser.on('message', function(message) {
    var connection;
    if(message.connectionId) 
        connection = self.connections[message.connectionId]; 
    messageHandlers[message.name](self, socket, message, connection);
  });
  self.peers.push(socket);
  socket.on('data', function(data) {
    messageParser.processData(data);
  });
  socket.on('close', function() {
    self.removePeer(socket);
  });
  self.emit('peerConnect', socket);
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
        self.addPeer(socket);
      }
    });
  });
};

Router.prototype.listenForPeers = function(port) {
  var self = this;
  var listener = Listener(port);
  listener.on('connect', function(socket) {
    self.addPeer(socket);
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
    this.on('peerConnect', function(socket) {
      var tsock = socket.transport;
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
