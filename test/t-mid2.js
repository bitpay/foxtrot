var foxtrot = require('..');
var tracer = require('./tracer')(console);
tracer.onNode(foxtrot);

// setup foxtrot node
foxtrot.listenForPeers(8455);
foxtrot.connectToPeer('127.0.0.1', 8454);
