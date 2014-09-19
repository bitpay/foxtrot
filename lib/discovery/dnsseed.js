// peer discover through well known DNS names
var connect = require('./connect');

var defaultOptions = {
  seeds: {
    bitpaylabs: 'foxtrot.bitpaylabs.com:9333'
  }
};

module.exports.start = function(router, options) {
  options = options || defaultOptions;
  var seeds = options.seeds || defaultOptions.seeds;
  for(seedName in seeds) {
    var seed = seeds[seedName];
    var host = seed.split(':')[0];
    var port = seed.split(':')[1];
    connect(router, {host: host, port: port});
  }
};

module.exports.stop = function(){};
