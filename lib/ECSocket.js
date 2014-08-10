'use strict';
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var bitcore = require('bitcore');
var Key = bitcore.Key;
var sha256 = bitcore.util.sha256;
var Message = bitcore.Message;
var ECIES = bitcore.ECIES;
var SecureRandom = bitcore.SecureRandom;
var crypto = require('crypto');

// TODO
// 1 exchange an "identity" (to allow peers to verify the other side) ...the current
//   exchange of a pubkey would reveal the identity of the client to any eavesdropper
//   so we want to just use a one time pubkey for handshake ...a similar situation 
//   exists for the pubkey send in the server's initial response ...even though it is
//   encrypted, it could be used for an attacker to try and initiate a connection in order
//   to obtain the identity of a server ...after initial handshake, the client needs to 
//   sign something with it's true identity and give the server an opportunity to verify
//   it before the server responds with its identity ...the final step is for the 
//   client to verify the server's identity before concluding the handshake with an OK
//   message (identification would use a blockchain like decentralized key database)
//
// 2 include a 4 byte checksum at the beginning of each message and verify it...we could 
//   do the same thing as the bitcoin protocol and use a double sha256 ...it's possible
//   that this is unnecessary with our use of aes256 (need to research)
//
// 3 research whether it reveals too much information for data chunks to be netstring
//   encoded (an eavesdropper could potentially infer information from the length
//   of chunks of encrypted data begin sent between peers)

/*
// Signing
var message = 'my message';
var key = Key.generateSync();
var sig = Message.sign(message, key);
console.log(Message.verifyWithPubKey(key.public, message, sig));

// Encryption/Decryption
var key = new bitcore.Key();
key.private = bitcore.util.sha256('test');
key.regenerateSync();

var message = new Buffer('this is my message');
var encrypted = ECIES.encrypt(key.public, message);
var decrypted = ECIES.decrypt(key.private, encrypted);
console.log(decrypted.toString());

// symmetric Encryption

ECIES.symmetricEncrypt = function(key, iv, message) {
  var cipheriv = crypto.createCipheriv('AES-256-CBC', key, iv);
  var a = cipheriv.update(message);
  var b = cipheriv.final();
  var r = Buffer.concat([iv, a, b]);
  return r;
};

ECIES.symmetricDecrypt = function(key, encrypted) {
  var iv = encrypted.slice(0, 16);
  var decipheriv = crypto.createDecipheriv('AES-256-CBC', key, iv);
  var todecrypt = encrypted.slice(16, encrypted.length);
  var a = decipheriv.update(todecrypt);
  var b = decipheriv.final();
  var r = Buffer.concat([a, b]);
  return r;
};
*/

var netstring = require('./netstring');
var MAGIC = 'v0001';

var STATE_NEW = 'new';
var STATE_WAIT_MAGIC = 'wait_magic';
var STATE_WAIT_PUBKEY = 'wait_pubkey';
var STATE_WAIT_PREMASTER = 'wait_premaster';
var STATE_WAIT_OK = 'wait_ok';
var STATE_READY = 'ready';

var NOOP = function() {};

function ECSocket(socket) {
  if(!(this instanceof ECSocket)) return new ECSocket(socket);
  var self = this;
  this.state = STATE_NEW;
  this.key = Key.generateSync(); // key for exchange of session key
  this.sessionKey; // key for AES symmetric encryption
  this.socket = socket;
  socket.on('data', function(data) {
    self.parser.processData(data);
  });
  this.parser = netstring.Parser();
  this.parser.on('data', function(data) {
    self.messageHandler(data);
  });
  this.parser.on('error', function(err) {
    self.socket.close();
    self.emit('error', err);
  });
  this.messageHandler = NOOP;
};
util.inherits(ECSocket, EventEmitter);

ECSocket.prototype.write = function(message) {
  if(this.state != STATE_READY) {
    this.emit('error', new Error('socket is not ready'));
    return;
  };
  this.socket.write(netstring(this.encrypt(message)));
};

function messageHandler(message) {
  this.emit('data', this.decrypt(message));
};

ECSocket.prototype.clientHandshake = function(callback) {
  var self = this;
  this.socket.write(netstring(MAGIC));
  this.socket.write(netstring(this.key.public));
  this.expectServerPubkey(function(err, pubkey) {
    if(err) return callback(err);
    self.expectPreMasterKey(function(err, preMasterKeyEncrypted) {
      if(err) return callback(err);
      var preMasterKey = ECIES.decrypt(self.key.private, preMasterKeyEncrypted);
      self.sessionKey = sha256(preMasterKey);
      self.socket.write(netstring(self.encrypt(new Buffer('OK'))));
      self.expectOK(function(err) {
        if(err) return callback(err);
        self.messageHandler = messageHandler;
        self.state = STATE_READY;
        callback(); 
      });  
    });
  });
};

ECSocket.prototype.serverHandshake = function(callback) {
  var self = this;
  self.expectMagic(function(err) {
    if(err) return callback(err);
    self.expectClientPubkey(function(err, pubkey) {
      if(err) return callback(err);
      var myPubKeyEncrypted = ECIES.encrypt(pubkey, self.key.public);
      self.socket.write(netstring(myPubKeyEncrypted));
      var preMasterKey = SecureRandom.getRandomBuffer(32);
      var preMasterKeyEncrypted = ECIES.encrypt(pubkey, preMasterKey);
      self.socket.write(netstring(preMasterKeyEncrypted));
      self.sessionKey = sha256(preMasterKey);
      self.socket.write(netstring(self.encrypt(new Buffer('OK'))));
      self.expectOK(function(err) {      
        if(err) return callback(err);
        self.messageHandler = messageHandler;
        self.state = STATE_READY;
        callback();
      });
    });
  });
};

ECSocket.prototype.expect = function(state, handler) {
  this.state = state;
  this.messageHandler = function(message) {
    this.messageHandler = NOOP;
    handler(message);
  };
};

ECSocket.prototype.expectOK = function(callback) {
  var self = this;
  this.expect(STATE_WAIT_OK, function(message) {
    if(self.decrypt(message).toString() == 'OK') {
      callback();
    } else {
      callback(new Error('expected OK'));
    }
  });
};

ECSocket.prototype.expectPreMasterKey = function(callback) {
  this.expect(STATE_WAIT_PREMASTER, function(message) {
    callback(null, message);
  });
};

ECSocket.prototype.expectMagic = function(callback) {
  this.expect(STATE_WAIT_MAGIC, function(message) {
    if(message != MAGIC) return callback(new Error('no magic'));
    callback();
  });
};

ECSocket.prototype.expectClientPubkey = function(callback) {
  this.expect(STATE_WAIT_PUBKEY, function(message) {
    callback(null, message);
  });
};

ECSocket.prototype.expectServerPubkey = function(callback) {
  var self = this;
  this.expect(STATE_WAIT_PUBKEY, function(message) {
    callback(null, ECIES.decrypt(self.key.private, message));   
  });
};

ECSocket.prototype.encrypt = function(message) {
  var iv = SecureRandom.getRandomBuffer(16);
  var cipheriv = crypto.createCipheriv('AES-256-CBC', this.sessionKey, iv);
  var a = cipheriv.update(message);
  var b = cipheriv.final();
  return Buffer.concat([iv, a, b], iv.length+a.length+b.length);
};

ECSocket.prototype.decrypt = function(message) {
  var iv = message.slice(0, 16);
  var decipheriv = crypto.createDecipheriv('AES-256-CBC', this.sessionKey, iv);
  var todecrypt = message.slice(16, message.length);
  var a = decipheriv.update(todecrypt);
  var b = decipheriv.final();
  return Buffer.concat([a, b], a.length + b.length);
};

module.exports = ECSocket;
