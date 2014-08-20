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
    routerA = Router();
    routerB = Router();
    routerC = Router();
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
});
