var Connection = require('./Connection');
var Message = require('./Message');
var bitcore = require('bitcore');
var sha256ripe160 = bitcore.util.sha256ripe160;
var ECIES = bitcore.ECIES;
var Msg = bitcore.Message;
var Socket = require('./Socket');
var ConnectionRequest = require('./ConnectionRequest');
var SecureRandom = bitcore.SecureRandom;
var sha256 = bitcore.util.sha256;

function trace() {
  if(!module.exports.tracer) return;
  module.exports.tracer.apply(null, arguments);
};

module.exports = {
  CONNECT: function(router, socket, message, connection) {
    if(!connection) {
      router.connections[message.connectionId] = Connection(message.connectionId);

      //peer.GETCONNECTINFO(message.connectionId);

      var msg = Message.GETCONNECTINFO(message.connectionId);
      socket.write(msg.toBuffer());
    }
  },

  GETCONNECTINFO: function(router, socket, message, connection) {
    if(!connection) return; // we don't have that connection info
    var request = connection.request;
    var msg = Message.CONNECTINFO(request.address, request.nonce, request.credentials);
    socket.write(msg.toBuffer());
  },

  CONNECTINFO: function(router, socket, message) {
    var pubkey = message.address;
    var nonce = message.nonce;
    var credentials = message.credentials;
    var connectionId = sha256ripe160(message.toBuffer().slice(1,42));
    if(!router.connections[connectionId]) router.connections[connectionId] = Connection(connectionId);
    var connection = router.connections[connectionId];
    if(!connection.origin) connection.origin = socket;
    var request = connection.request;
    request.address = pubkey;
    request.nonce = nonce;
    request.credentials = credentials;

    // check if this connection can be terminated locally
    for(var i=0; i<router.endpoints.length; i++) {
      var svr = router.endpoints[i];
      if(svr.isMatch(pubkey)) {
        var decryptedCredentials = ECIES.decrypt(svr.key.private, credentials);
        var clientPubkey = decryptedCredentials.slice(0, 33);
        if(Msg.verifyWithPubKey(clientPubkey, Buffer.concat([pubkey, nonce]), decryptedCredentials.slice(33))) {
          var sock = router.connections[connectionId];
          if(!(sock && sock.isSocket())) {
            sock = Socket(svr);
            sock.beDestination();
            router.connections[connectionId] = sock;
          }
          if(!sock.request) {
            var request = ConnectionRequest(connectionId);
            sock.request = request;
            request.address = pubkey;
            request.nonce = nonce;
            request.credentials = credentials;
          }
          sock.endpoint = svr;

          var connectionIdSig = Msg.sign(connectionId, svr.key);
          var preMasterKey = SecureRandom.getRandomBuffer(32);
          var preMasterKeyEncrypted = ECIES.encrypt(clientPubkey, preMasterKey);
          var msg = Message.CONNECTACK(connectionId, connectionIdSig, preMasterKeyEncrypted);
          sock.key = sha256(preMasterKey);
          socket.write(msg.toBuffer());
          return;
        }
        // now verify credentials and generate and send CONNECTACK
      }
    }

    // propagate the connect request to other peers
    var msg = Message.CONNECT(connectionId).toBuffer();
    for(var i=0; i<router.peers.length; i++) {
      var peer = router.peers[i];
      if(peer !== socket) {
        try {
          peer.write(msg);
        } catch(e) {
          router.removePeer(peer);
        }
      }
    }
  },

  CONNECTACK: function(router, socket, message, connection) {
    if(!connection) return; // unknown connection
    var request = connection.request;
    var connectionIdSig = message.signature;
    var preMasterKeyEncrypted = message.preMaster;;
    if(Msg.verifyWithPubKey(request.address, message.connectionId, connectionIdSig)) {
      if(connection.isSocket()) {
        connection.key = sha256(ECIES.decrypt(connection.endpoint.key.private, preMasterKeyEncrypted));
        var msg = Message.CONNECTED(message.connectionId);
        socket.write(msg.toBuffer());
        connection.transport = socket;
        connection.emit('connect');
      } else {
        trace('connection established '+connection.request.address.toString('hex'));
        connection.destination = socket;
        connection.origin.write(message.toBuffer());
      }
    } else {
      // signature verification failed
      return;
    }
  },

  CONNECTED: function(router, socket, message, connection) {
    // note, we probably this message signed by the client before doing anything
    if(!connection) return; // unknown connection
    if(connection.isSocket()) {
      connection.transport = socket;
      connection.endpoint.emit('connect', connection);
    } else {
      connection.destination.write(message.toBuffer());
    }
  },

  SENDORIG: function(router, socket, message, connection) {
    if(!connection) return;
    connection.deliverOrigin(message.toBuffer());
  },

  SENDDEST: function(router, socket, message, connection) {
    if(!connection) return;
    connection.deliverDest(message.toBuffer());
  },

  ENDORIG: function(router, socket, message, connection) {
    if(!connection) return;
    connection.endOrigin(message.toBuffer());
  },

  ENDDEST: function(router, socket, message, connection) {
    if(!connection) return;
    connection.endDest(message.toBuffer());
  }
};
