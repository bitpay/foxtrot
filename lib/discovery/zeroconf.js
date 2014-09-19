// Discovery of peers on the local network using 
// zeroconf (aka bonjour or mDNS + DNS-SD)

var connect = require('./connect');
var apps = require('polo')();

var serviceName = 'foxtrot';
var router = null;

function handler(name, service) {
  if((service.name == serviceName) && (service.routerId != router.id())) {
    connect(router, {
      host: service.host,
      port: service.port
    });
  }
};

module.exports.start = function(aRouter, options) {
  if(router) throw new Error('zeroconf discovery already started');
  router = aRouter;
  apps.on('up', handler);
};

module.exports.stop = function() {
  apps.removeListener('up', handler);
  apps.stop();
};
