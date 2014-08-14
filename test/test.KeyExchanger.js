var async = require('async');
var KeyExchanger = require('..').KeyExchanger;
var should = require('chai').should();
var Socket = require('./util/Socket');

describe('key exchanger', function() {
  var socketPair, client, server;

  beforeEach(function() {
    socketPair = Socket.createPair();
    client = KeyExchanger(socketPair[0]);
    server = KeyExchanger(socketPair[1]);
  });

  it('should successfully handshake', function(testDone) {
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
