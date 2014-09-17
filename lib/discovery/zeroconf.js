// Discovery of peers on the local network using 
// zeroconf (aka bonjour or mDNS + DNS-SD)

var connect = require('./connect');
var sha256ripe160 = require('bitcore').util.sha256ripe160;;
var base58encode = require('bitcore').Base58.base58.encode;
var polo = require('polo');
var apps = polo();

var apps;
var server;
var serviceName = 'foxtrot';

module.exports.start = function(router, options) {
  var routerId = base58encode(sha256ripe160(router.key.public));
  if (options.advertise) {
    var tcpserver = options.tcpserver || require('./tcpserver');
    tcpserver.on('listening', function(listener) {
      server = listener;
      var app = {
        name: serviceName, //WAS: name: routerId,
        port: server.port,
        routerId: routerId,
      }
      server.advertisement = apps.put(app);
    });
  }
  if (options.discover) {
    apps.once('up', function(name, service) {
      if (service.routerId !== routerId) {
        connect(router, {
          host: service.host,
          port: service.port
        });
      }
    });
  }
};

module.exports.stop = function() {};
