var util = require('util');
var net = require('net');
var netstring = require('./netstring');
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
var Message = bitcore.Message;
var Endpoint = require('./Endpoint');

var bitcore = require('bitcore');
var Key = bitcore.Key;

var CMD_CONNECT = 0;
var CMD_GETCONNECTINFO = 1;
var CMD_CONNECTINFO = 2;
var CMD_CONNECTACK = 3;
var CMD_CONNECTED = 4;
var CMD_SENDDEST = 5;
var CMD_SENDORIG = 6;
var CMD_ENDDEST = 7;
var CMD_ENDORIG = 8;

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

  var msg = new Buffer(21);
  msg.writeUInt8(CMD_CONNECT, 0);
  request.id.copy(msg, 1);
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
  self.peers.push(socket);
  socket.on('data', function(data) {
    self.processPeerMessage(socket, data);
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

Router.prototype.processPeerMessage = function(socket, data) {
  var cmd = data.readUInt8(0);
  if(cmd == CMD_CONNECT) {
    if(data.length != 21) {
      socket.close();
      this.emit('peerError', new Error('malformed CONNECT message'));
      return;
    }
    var connectionId = data.slice(1, 21);
    if(!this.connections[connectionId]) {
      this.connections[connectionId] = Connection(connectionId);
      var msg = new Buffer(21);
      msg.writeUInt8(CMD_GETCONNECTINFO, 0);
      connectionId.copy(msg, 1);
      socket.write(msg);
    }
  } 
  if(cmd == CMD_GETCONNECTINFO) {
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return; // we don't have that connection info
    var request = connection.request;
    var msg = new Buffer(1);
    msg.writeUInt8(CMD_CONNECTINFO, 0);
    msg = Buffer.concat([msg, request.address, request.nonce, request.credentials]);
    socket.write(msg);
  }
  if(cmd == CMD_CONNECTINFO) {
    var pubkey = data.slice(1, 34);
    var nonce = data.slice(34, 42);
    var credentials = data.slice(42);
    var connectionId = sha256ripe160(data.slice(1,42));
    if(!this.connections[connectionId]) this.connections[connectionId] = Connection(connectionId);
    var connection = this.connections[connectionId];
    if(!connection.origin) connection.origin = socket;
    var request = connection.request;
    request.address = pubkey;
    request.nonce = nonce;
    request.credentials = credentials;

    // check if this connection can be terminated locally
    for(var i=0; i<this.endpoints.length; i++) {
      var svr = this.endpoints[i];
      if(svr.isMatch(pubkey)) {
        var decryptedCredentials = ECIES.decrypt(svr.key.private, credentials);
        var clientPubkey = decryptedCredentials.slice(0, 33);
        if(Message.verifyWithPubKey(clientPubkey, Buffer.concat([pubkey, nonce]), decryptedCredentials.slice(33))) {
          var sock = this.connections[connectionId];
          if(!(sock && sock.isSocket())) {
            sock = Socket(svr);
            sock.beDestination();
            this.connections[connectionId] = sock;
          }
          if(!sock.request) {
            var request = ConnectionRequest(connectionId);
            sock.request = request;
            request.address = pubkey;
            request.nonce = nonce;
            request.credentials = credentials;
          }
          sock.endpoint = svr;

          var msg = new Buffer(1);
          msg.writeUInt8(CMD_CONNECTACK, 0);
          var connectionIdSig = Message.sign(connectionId, svr.key);
          var preMasterKey = SecureRandom.getRandomBuffer(32);
          var preMasterKeyEncrypted = ECIES.encrypt(clientPubkey, preMasterKey);
          sock.key = sha256(preMasterKey);
          msg = Buffer.concat([msg, connectionId, netstring(connectionIdSig), netstring(preMasterKeyEncrypted)]);
          socket.write(msg);
          return;
        }
        // now verify credentials and generate and send CONNECTACK
      }
    }

    // propagate the connect request to other peers
    var msg = new Buffer(21);
    msg.writeUInt8(CMD_CONNECT, 0);
    connectionId.copy(msg, 1);
    for(var i=0; i<this.peers.length; i++) {
      var peer = this.peers[i];
      if(peer !== socket) {
        try {
          peer.write(msg);
        } catch(e) {
          this.removePeer(peer);
        }
      }
    }
  }
  if(cmd == CMD_CONNECTACK) {
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return; // unknown connection
    var request = connection.request;
    var parser = netstring.Parser();
    var connectionIdSig = null;
    var preMasterKeyEncrypted = null;
    parser.on('data', function(data) {
      if(!connectionIdSig) {
        connectionIdSig = data;
      } else {
        preMasterKeyEncrypted = data;
      }
    });
    parser.processData(data.slice(21));
    if(Message.verifyWithPubKey(request.address, connectionId, connectionIdSig)) {
      if(connection.isSocket()) {
        connection.key = sha256(ECIES.decrypt(connection.endpoint.key.private, preMasterKeyEncrypted));
        var msg = new Buffer(1);
        msg.writeUInt8(CMD_CONNECTED, 0);
        msg = Buffer.concat([msg, connectionId]);
        socket.write(msg);
        connection.transport = socket;
        connection.emit('connect');
      } else {
        trace('connection established '+connection.request.address.toString('hex'));
        connection.destination = socket;
        connection.origin.write(data);
      }
    } else {
      // signature verification failed
      return;
    }
  }
  if(cmd == CMD_CONNECTED) {
    // note, we probably this message signed by the client before doing anything
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return; // unknown connection
    if(connection.isSocket()) {
      connection.transport = socket;
      connection.endpoint.emit('connect', connection);
    } else {
      connection.destination.write(data);
    }
  }
  if(cmd == CMD_SENDORIG) {
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return;
    connection.deliverOrigin(data);
  }
  if(cmd == CMD_SENDDEST) {
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return;
    connection.deliverDest(data);
  }
  if(cmd == CMD_ENDORIG) {
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return;
    connection.endOrigin(data); 
  }
  if(cmd == CMD_ENDDEST) {
    var connectionId = data.slice(1, 21);
    var connection = this.connections[connectionId];
    if(!connection) return;
    connection.endDest(data); 
  }
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

function trace() {
  if(!Router.tracer) return;
  Router.tracer.apply(null, arguments);
};

module.exports = Router;
