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

messages = {};

messages.VERSION = function(router, peer, message) {
  peer.version = message.version;
  peer.id = message.identity;
  peer.VERACK();
};

messages.CONNECT = function(router, peer, message, connection) {
  if(!connection) {
    connection = Connection(message.connectionId);
    router.addConnection(connection);
    peer.GETCONNECTINFO(message.connectionId);
  }
};

messages.GETCONNECTINFO = function(router, peer, message, connection) {
  if(!connection) return; // we don't have that connection info
  var request = connection.request;
  peer.CONNECTINFO(request.address, request.nonce, request.credentials);
};

messages.CONNECTINFO = function(router, peer, message) {
  var pubkey = message.address;
  var nonce = message.nonce;
  var credentials = message.credentials;
  var connectionId = sha256ripe160(message.toBuffer().slice(1,42));
  var connection = router.getConnection(connectionId, function() {
    return Connection(connectionId);
  });
  if(!connection.origin) connection.origin = peer;
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
        sock.key = sha256(preMasterKey);
        peer.CONNECTACK(connectionId, connectionIdSig, preMasterKeyEncrypted);
        return;
      }
      // now verify credentials and generate and send CONNECTACK
    }
  }

  // propagate the connect request to other peers
  var msg = Message.CONNECT(connectionId).toBuffer();
  for(var i=0; i<router.peers.length; i++) {
    var otherPeer = router.peers[i];
    if(otherPeer !== peer) {
      try {
        otherPeer.write(msg);
      } catch(e) {
        router.removePeer(peer);
      }
    }
  }
};

messages.CONNECTACK = function(router, peer, message, connection) {
  if(!connection) return; // unknown connection
  var request = connection.request;
  var connectionIdSig = message.signature;
  var preMasterKeyEncrypted = message.preMaster;;
  if(Msg.verifyWithPubKey(request.address, message.connectionId, connectionIdSig)) {
    if(connection.isSocket()) {
      connection.key = sha256(ECIES.decrypt(connection.endpoint.key.private, preMasterKeyEncrypted));
      peer.CONNECTED(message.connectionId);
      connection.transport = peer;
      connection.emit('connect');
    } else {
      trace('connection established '+connection.request.address.toString('hex'));
      connection.destination = peer;
      connection.origin.send(message);
    }
  } else {
    // signature verification failed
    return;
  }
};

messages.CONNECTED = function(router, peer, message, connection) {
  // note, we probably this message signed by the client before doing anything
  if(!connection) return; // unknown connection
  if(connection.isSocket()) {
    connection.transport = peer;
    connection.endpoint.emit('connect', connection);
  } else {
    connection.destination.send(message);
  }
};

messages.SENDORIG = function(router, peer, message, connection) {
  if(!connection) return;
  connection.deliverOrigin(message);
};

messages.SENDDEST = function(router, peer, message, connection) {
  if(!connection) return;
  connection.deliverDest(message);
};

messages.ENDORIG = function(router, peer, message, connection) {
  if(!connection) return;
  connection.endOrigin(message);
};

messages.ENDDEST = function(router, peer, message, connection) {
  if(!connection) return;
  connection.endDest(message);
};

function trace() {
  if(!messages.tracer) return;
  messages.tracer.apply(null, arguments);
};

module.exports = messages;
