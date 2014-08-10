var foxtrot = require('..');
var tracer = require('./tracer')(console);
tracer.onNode(foxtrot);

var Key = require('bitcore').Key;
var identity = new Key();
identity.private = new Buffer('66e41a1d982b755717135cc3a4397a6f0238a74d3e07900723a76c9f0e138090', 'hex');
identity.regenerateSync();

// setup foxtrot node
foxtrot.listenForPeers(8453);
//foxtrot.connect('127.0.0.1', 8453);

var server = foxtrot.createServer({key: identity});
tracer.onServer(server);
server.on('connect', function(socket) {
  socket.on('data', function(data) {
    console.log('got data from client = '+data);
    socket.write(data+' back at you!');
  });
  socket.on('close', function() {
    console.log('socket closed');
  });
});

var identity = new Key();
identity.private = new Buffer('1ff8def92d1d277066063fb0680454ebfd6da1b614f57095cc4fc08034759d6f', 'hex');
identity.regenerateSync();

var server = foxtrot.createServer({key: identity});
tracer.onServer(server);
server.on('connect', function(socket) {
  foxtrot.addPeer(socket);
});

