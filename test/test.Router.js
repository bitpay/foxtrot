var should = require('chai').should();
var Router = require('..').Router;
var Peer = require('..').Peer;
var Socket = require('./util/Socket');
var Key = require('bitcore').Key;

describe('router', function() {
  var routerA, routerB, routerC;
  var linkA, linkB;

  beforeEach(function() {
    linkA = Socket.createPair();
    linkB = Socket.createPair();
    routerA = Router.noDiscovery();
    routerB = Router.noDiscovery();
    routerC = Router.noDiscovery();
    routerA.addPeer(Peer(linkA[0], routerA));
    routerB.addPeer(Peer(linkA[1], routerB));
    routerB.addPeer(Peer(linkB[0], routerB));
    routerC.addPeer(Peer(linkB[1], routerC));
  });
  it('should make a connection', function(testDone) {
    var key = Key.generateSync();
    var server = routerC.createServer({key: key});
    var client = routerA.connect({address: key.public}, function() {
      testDone();
    });
  });
  it('should be able to transport data', function(testDone) {
    var msg1 = 'message one';
    var msg2 = 'message two';
    var gotClientMessage = false;
    var gotServerMessage = false;
    function checkDone() {
      if(gotClientMessage && gotServerMessage) {
        testDone();
      }
    };
    var key = Key.generateSync();
    var server = routerC.createServer({key: key});
    var client = routerA.connect({address: key.public}, function() {
      client.write(new Buffer(msg1));
    });
    server.on('connect', function(serverSocket) {
      serverSocket.on('data', function(data) {
        data.toString().should.equal(msg1);
        gotServerMessage = true;
        checkDone();
      });
      serverSocket.write(new Buffer(msg2));
    });
    client.on('data', function(data) {
      data.toString().should.equal(msg2);
      gotClientMessage = true;
      checkDone();
    });
  });
});
