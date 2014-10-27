'use strict';

var foxtrot = require('..');

var server = foxtrot.createServer();
console.log('server listening on '+server.key.public.toString('hex'));
server.on('connect', function(socket) {
  socket.write('hello from server!\n');
  socket.on('data', function(data) {
    socket.write(data);
  });
});
