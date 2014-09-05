var net = require('net');
var KeyExchanger = require('../KeyExchanger');
var Peer = require('../Peer');

function tcpconnect(router, options) {
  var tcpSocket = net.connect(options, function() {
    var keyExchanger = KeyExchanger(tcpSocket);
    keyExchanger.clientHandshake(function(err, socket) {
      if(err) {
        trace(err);
      } else {
        var peer = Peer(socket, router);
        var timer;
        var handler = function(message) {
          if(message.name == 'VERSION') {
            peer.version = message.version;
            peer.id = message.identity;
            peer.VERACK();
          }
          if(message.name == 'VERACK') {
            clearTimeout(timer);
            peer.removeListener('message', handler);
            router.addPeer(peer);
          }
        }
        timer = setTimeout(function() {
          peer.removeListener('message', handler);
          peer.emit('error', new Error('timeout'));
        }, 3000);
        peer.on('message', handler);
        peer.VERSION(new Buffer(4), new Buffer('foo'), new Buffer(20), new Buffer(8), new Buffer(8), new Buffer(8), new Buffer(26), new Buffer(26));
      }
    });
  });
};

tcpconnect.start = function(router, options) {
  var self = this;
  for(var i=0; i<options.length; i++) {
    var opts = options[i];
    if(typeof opts == 'string') {
      opts = {host: '127.0.0.1', port: opts};
      var indexOfColon = opts.port.indexOf(':');
      if(indexOfColon >= 0) {
        opts = {
          host: opts.port.split(':')[0],
          port: opts.port.split(':')[1]
        };
      }

    }
    tcpconnect(router, opts);
  }
};

module.exports = tcpconnect;
