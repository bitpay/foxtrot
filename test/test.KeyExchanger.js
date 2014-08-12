var util = require('util');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var KeyExchanger = require('..').KeyExchanger;
var should = require('chai').should();

function Socket() {
  this.otherEnd = null;
};
util.inherits(Socket, EventEmitter);

Socket.prototype.write = function(data) {
  // split the data just for good measure (to make sure
  // we don't have any accidental depenedencies on data
  // chunking 
  var self = this;
  process.nextTick(function() {
    if(data.length > 3) {
      self.otherEnd.emit('data', data.slice(0,3));
      self.otherEnd.emit('data', data.slice(3));
    } else {
      self.otherEnd.emit(data);
    }
  });
}

describe('key exchanger', function() {
  var clientSocket, serverSocket, client, server;

  beforeEach(function() {
    clientSocket = new Socket();
    serverSocket = new Socket();
    clientSocket.otherEnd = serverSocket;
    serverSocket.otherEnd = clientSocket;

    client = KeyExchanger(clientSocket);
    server = KeyExchanger(serverSocket);
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
