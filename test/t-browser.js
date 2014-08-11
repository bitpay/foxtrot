var foxtrot = require('..');
var tracer = require('./tracer')(console);
tracer.onNode(foxtrot);
var Key = require('bitcore').Key;

var address = new Buffer('02b16cd9c5dd3ffb483b6cc9be0f68f64cbcec17df253ff91903d875e89f0608d4', 'hex');

// setup foxtrot node
//foxtrot.listen(8453);

for(var i=2; i<process.argv.length; i++) {
  foxtrot.connectToPeer('127.0.0.1', process.argv[i]);
};

var peerCount = 0;
var called = false;
foxtrot.on('peerConnect', function() {
  peerCount++;
  if(peerCount < (process.argv.length - 2)) return;
  if(called) {
    // we are here after setting up the second layer peer
    var sock3 = foxtrot.connect({address: address, peer: peerSocket, key: foxtrot.newKey()});
    sock3.on('connect', function() {
      console.log('connected to server again '+sock3.request.address.toString('hex'));
      sock3.write('Double Woot!');
    });
    sock3.on('data', function(data) {
      console.log('got data from server = '+data);
    });
    return;
  }
  called = true;
  
  var key = foxtrot.newKey();
  var socket = foxtrot.connect({address: address, key: key});
  socket.on('connect', function() {
    console.log('connected to server '+socket.request.address.toString('hex'));
    socket.write('Woot!');
  });
  socket.on('data', function(data) {
    console.log('got data from server = '+data);
  });
  socket.on('close', function() {
    console.log('connection closed');
  });

  var peerAddress = new Buffer('0391f7cd3dece43d4a840e69a28f6d3ab0bd08c42991d2e1dbf0bed5581ef03460', 'hex');
  var peerSocket = foxtrot.connect({address: peerAddress, key: foxtrot.newKey()});
  peerSocket.on('connect', function() {
    console.log('connected to peer server '+peerSocket.request.address.toString('hex'));
    foxtrot.addPeer(peerSocket);
  });
});
