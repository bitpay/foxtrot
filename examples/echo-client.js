'use strict';

var foxtrot = require('..');

// replace with server foxtrot address
var server = '02b536305eaaebccc3b77fc5a12acbaf827ac093924d3b9ecc7cf43bcedd946c9c';
var client = foxtrot.connect({
  address: new Buffer(server, 'hex')
}, function() {
  console.log('connected to server!');
  process.stdin.pipe(client);
  client.pipe(process.stdout);
});
