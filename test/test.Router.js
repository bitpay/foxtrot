var should = require('chai').should();
var Router = require('..').Router;
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
    routerA.addPeer(linkA[0]);
    routerB.addPeer(linkA[1]);
    routerB.addPeer(linkB[0]);
    routerC.addPeer(linkB[1]);
  });
  it('should make a connection', function(testDone) {
    var key = Key.generateSync();
    var server = routerC.createServer({key: key});
    var client = routerA.connect({address: key.public}, function() {
      testDone();
    });
  });
});
