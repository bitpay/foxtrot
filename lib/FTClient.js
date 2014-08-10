var util = require('util');
var EventEmitter = require('events').EventEmitter;

function FTClient(router, options) {
  if(!(this instanceof FTClient)) return new FTClient(router, options);
  this.router = router;
  this.destination = options.address;
  this.key = options.key;
};
util.inherits(FTClient, EventEmitter);

module.exports = FTClient;
