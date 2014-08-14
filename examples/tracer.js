function Tracer(console) {
  if(!(this instanceof Tracer)) return new Tracer(console);
  var self = this;

  self.setTracer = function(obj) {
    obj.tracer = console.log.bind(console);
  };

  self.onNode = function(foxtrot) {
    self.setTracer(foxtrot);
    foxtrot.on('peerConnect', function(socket) {
      var tsock = socket.transport;
      console.log('peer connected (local: '+tsock.localAddress+':'+tsock.localPort+', remote: '+tsock.remoteAddress+':'+tsock.remotePort+')');
    });
  };

  self.onServer = function(server) {
    self.setTracer(server);
    server.on('connect', function(socket) {
      console.log('client connected to '+socket.request.address.toString('hex'));
    });
  };
};

module.exports = Tracer;
