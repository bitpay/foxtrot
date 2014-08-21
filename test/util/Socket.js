var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Socket() {
  this.otherEnd = null;
};
util.inherits(Socket, EventEmitter);

Socket.prototype.write = function(data, encoding, callback) {
  // split the data just for good measure (to make sure
  // we don't have any accidental depenedencies on data
  // chunking 
  var self = this;
  if(typeof encoding == 'function') {
    callback = encoding;
    encoding = undefined;
  }
  if(typeof data == 'string') data = new Buffer(data, encoding);
  callback && process.nextTick(callback);
  process.nextTick(function() {
    if(data.length > 3) {
      self.otherEnd.emit('data', data.slice(0,3));
      self.otherEnd.emit('data', data.slice(3));
    } else {
      self.otherEnd.emit('data', data);
    }
  });
}

Socket.createPair = function() {
  var answer = [new Socket(), new Socket()];
  answer[0].otherEnd = answer[1];
  answer[1].otherEnd = answer[0];
  return answer;
};

module.exports = Socket;
