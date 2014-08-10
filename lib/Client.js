var net = require('net');
var ECSocket = require('./ECSocket');

function Client(host, port) {
  if(!(this instanceof Client)) return new Client(host, port);
  this.host = host;
  this.port = port;
};

Client.prototype.connect = function(callback) {
  var client = net.connect({host: this.host, port: this.port}, function() {
    sec.clientHandshake(function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log('handshake success');
        sec.write('this is a test message from the client');
      }
    });
    sec.on('data', function(data) {
      console.log(data.toString());
    });
  });
  var sec = ECSocket(client);
};

module.exports = Client;
