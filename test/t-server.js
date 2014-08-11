var foxtrot = require('..');
var tracer = require('./tracer')(console);
tracer.onNode(foxtrot);
var net = require('net');
var http = require('http');

var Key = require('bitcore').Key;
var identity = new Key();
identity.private = new Buffer('66e41a1d982b755717135cc3a4397a6f0238a74d3e07900723a76c9f0e138090', 'hex');
identity.regenerateSync();

// setup foxtrot node
foxtrot.listenForPeers(process.argv[2]);
console.log('listening for peers on '+process.argv[2]);
for(var i=3; i<process.argv.length; i++) {
  foxtrot.connectToPeer('127.0.0.1', process.argv[i]);
}


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

// create a server for connecting a peer that runs on top of foxtrot
var identity = new Key();
identity.private = new Buffer('1ff8def92d1d277066063fb0680454ebfd6da1b614f57095cc4fc08034759d6f', 'hex');
identity.regenerateSync();
var server = foxtrot.createServer({key: identity});
tracer.onServer(server);
server.on('connect', function(socket) {
  foxtrot.addPeer(socket);
});

// create a server for proxying http
var identity = new Key();
identity.private = new Buffer('afc5f0040a950ad4f45792bbe13f700f698d3876af2464b4fe6e7440795de4e0', 'hex');
identity.regenerateSync();
var server = foxtrot.createServer({key: identity});
tracer.onServer(server);
server.on('connect', function(foxSocket) {
  var client = net.connect({host: '127.0.0.1', port: 1337}, function() {
    foxSocket.pipe(client);
    client.pipe(foxSocket);
  });
});

// create the local http server (unfortunately JS's http server implemention
// doesn't seem to give us a way to create a server on arbitrary listeners
var srv = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World!');
});
srv.listen(1337, '127.0.0.1');
