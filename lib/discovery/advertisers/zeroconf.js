// Discovery of peers on the local network using 
// zeroconf (aka bonjour or mDNS + DNS-SD)

var apps = require('polo')();

module.exports.advertise = function(advertisement) {
  return apps.put(advertisement);
};

module.exports.stop = function() {
  apps.stop();
};
