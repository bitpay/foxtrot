var foxtrot = require('..');
var tracer = require('./tracer')(console);
tracer.onNode(foxtrot);

// setup foxtrot node
foxtrot.listenForPeers(process.argv[2]);
console.log('listening for peers on '+process.argv[2]);
for(var i=3; i<process.argv.length; i++) {
  foxtrot.connectToPeer('127.0.0.1', process.argv[i]);
}
