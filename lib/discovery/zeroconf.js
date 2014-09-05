// Discovery of peers on the local network using 
// zeroconf (aka bonjour or mDNS + DNS-SD)

var mdns = require('mdns');
var connect = require('./connect');
var sha256ripe160 = require('bitcore').util.sha256ripe160;;
var base58encode = require('bitcore').Base58.base58.encode;

var browser;
var serviceName = 'foxtrot';

module.exports.start = function(router, options) {
  var routerId = base58encode(sha256ripe160(router.key.public));
  if(options.advertise) {
    var tcpserver = options.tcpserver || require('./tcpserver');
    tcpserver.on('listening', function(server) {
      server.advertisement = mdns.createAdvertisement(mdns.tcp(serviceName), server.port, {name: routerId});
      server.advertisement.start();
    });
  }
  if(options.discover) {
    browser = mdns.createBrowser(mdns.tcp(serviceName));
    browser.on('serviceUp', function(service) {
      if(service.name != routerId) {
        connect(router, {host: service.addresses[0], port: service.port});
      }
    });
    browser.start();
  }
};
