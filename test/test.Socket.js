var should = require('chai').should();
var Router = require('..').Router;
var Peer = require('..').Peer;
var SimSocket = require('./util/Socket');
var Key = require('bitcore').Key;

describe('router', function() {
  var routerA, routerB, routerC;
  var client, server;


  beforeEach(function(done) {
    var linkA = SimSocket.createPair();
    var linkB = SimSocket.createPair();
    routerA = Router.noDiscovery();
    routerB = Router.noDiscovery();
    routerC = Router.noDiscovery();
    routerA.addPeer(Peer(linkA[0], routerA));
    routerB.addPeer(Peer(linkA[1], routerB));
    routerB.addPeer(Peer(linkB[0], routerB));
    routerC.addPeer(Peer(linkB[1], routerC));
    var key = Key.generateSync();
    client = null;
    server = null;
    routerC.createServer({key: key}, function(socket) {
      server = socket;
      if(client && server) done();
    });
    var tmp = routerA.connect({address: key.public}, function() {
      client = tmp;
      if(client && server) done();
    });
  });
  it('should be able to transport data', function(testDone) {
    var msg1 = 'message one';
    var msg2 = 'message two';
    var gotClientMessage = false;
    var gotServerMessage = false;
    function checkDone() {
      if(gotClientMessage && gotServerMessage) testDone();
    };
    server.on('data', function(data) {
      data.toString().should.equal(msg1);
      gotServerMessage = true;
      checkDone();
    });
    client.on('data', function(data) {
      data.toString().should.equal(msg2);
      gotClientMessage = true;
      checkDone();
    });
    client.write(new Buffer(msg1));
    server.write(new Buffer(msg2));
  });
  it('should invoke callback after write', function(testDone) {
    client.write('test', testDone);
  });
  it('should notify on end', function(testDone) {
    server.on('end', function() {
      testDone();
    });
    client.end();
  });
  it('should notify on close', function(testDone) {
    server.on('close', function() {
      testDone();
    });
    client.end();
  });
  it('should trigger router connectionClose event', function(testDone) {
    routerB.on('connectionClose', function(connection) {
      testDone();
    });
    client.end();
  });
});
