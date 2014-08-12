var util = require('util');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var KeyExchanger = require('..').KeyExchanger;
var should = require('chai').should();
var Socket = require('../test-util/Socket');

describe('key exchanger', function() {
  var clientSocket, serverSocket, client, server;

  beforeEach(function() {
    socketPair = Socket.createPair();
    client = KeyExchanger(socketPair[0]);
    server = KeyExchanger(socketPair[1]);
  });

  it('should do something', function(testDone) {
    var csock, ssock;
    async.parallel(
      [
        function(done) {
          client.clientHandshake(function(err, aesSocket) {
            csock = aesSocket;
            done();
          });
        }, 
        function(done) {
          server.serverHandshake(function(err, aesSocket) {
            ssock = aesSocket;
            done();
          });
        }
      ],
      function(err, results) {
        csock.key.toString().should.equal(ssock.key.toString());
        csock.on('data', function(data) {
          data.toString().should.equal('data from server');
          testDone();
        });
        ssock.on('data', function(data) {
          data.toString().should.equal('data from client');
          ssock.write(new Buffer('data from server'));
        });
        csock.write(new Buffer('data from client'));
      }
    );
  });
});
