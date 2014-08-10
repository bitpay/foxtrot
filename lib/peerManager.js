var net = require('net');

function Transport() {
  this.server = null;
  this.peers = [];
};

Foxtrot.prototype.connect = function(host, port) {
  var client = net.connect({host: host, port: port}, function() { 
    //'connect' listener
    console.log('client connected');
    client.write('world!\r\n');
  });
  client.on('data', function(data) {
    if(data == 'ack');
    client.write('ack');
  });
  client.on('end', function() {
    console.log('client disconnected');
  });
};

Foxtrot.prototype.listen = function(port) {
  var self = this;
  if(self.server) self.stop();
  var server = net.createServer(function(c) {
    c.on('end', function() {
      self.peers.splice(c.peerNumber, 1);
      for(var i=0; i<self.peers.length; i++) {
        self.peers[i].peerNumber = i;
      }
    });
    c.on('data', function(data) {
      c.write('ack');
    });
    c.peerNumber = self.peers.push(c) - 1;
  });
  server.on('close', function() {
    if(self.server === server) self.server = null;
  });
  server.on('error', function(err) {
    console.log('server error: '+err);
  });
  server.listen(port, function() {
    //'listening' listener
    console.log('server bound');
  });
  self.server = server;
};

Foxtrot.prototype.stop = function() {
  if(!this.server) return;
  this.server.close();
};

Foxtrot.prototype.send = function(address, message, options, callback) {
  // 1) generate a SIN+Nonce from the address and send the message
  // note, for performance we may want to reuse a previously 
  // generated SIN+Nonce ...this method should be extended to support
  // options to control such behavior based on the desired level of 
  // privacy
  //
  // 2) based on the SIN, routing info, and postal fee, determine
  // a routing strategy
  //
  // 3) send message to peers
  //
  // 4) on the first ack, invoke the callback
   
  // For now, we are just going to deliver the message to all peers
  this.peers.forEach(function(peer) {
    peer.write(message);
  });
};

module.exports = Foxtrot;
