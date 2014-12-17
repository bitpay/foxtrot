# Foxtrot
[![NPM Package](https://img.shields.io/npm/v/foxtrot.svg?style=flat-square)](https://www.npmjs.org/package/foxtrot)
[![Build Status](https://img.shields.io/travis/bitpay/foxtrot.svg?branch=master&style=flat-square)](https://travis-ci.org/bitpay/foxtrot)
[![Coverage Status](https://img.shields.io/coveralls/bitpay/foxtrot.svg?style=flat-square)](https://coveralls.io/r/bitpay/foxtrot)

A simple and secure routing network based on bitcoin cryptography.
Foxtrot enables easy p2p communications and has built-in mechanisms
for peer discovery, creation of services addressable by public keys,
and establishing encrypted connections.


## Installation
`npm install foxtrot`

## Example

The easiest way to connect to the foxtrot network and send some
data is to spawn a server:

```
var foxtrot = require('foxtrot');

var server = foxtrot.createServer();
console.log('server listening on '+server.key.public.toString('hex'));
server.on('connect', function(socket) {
  socket.write('hello from server!\n');
  socket.on('data', function(data) {
    socket.write(data);
  }); 
});
```

and have a client connect to it:
```
var foxtrot = require('foxtrot');

var server = '024a4bf8759a8a28714d099e044dea99b20dd93bc86168568a0a97cd9d205e844a'; // server foxtrot address
var client = foxtrot.connect({
  address: new Buffer(server, 'hex')
}, function() {
  console.log('connected to server!');
  process.stdin.pipe(client);
  client.pipe(process.stdout);
});
```

For more advanced examples and configuration, see the examples folder

#License

**Code released under [the MIT license](https://github.com/bitpay/foxtrot/blob/master/LICENSE).**

Copyright 2014 BitPay, Inc.
