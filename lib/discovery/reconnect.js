// discovery module for reconnecting to peers that have recently 
// disconnected

module.exports.start = function(router, options) {
  router.on('peerDisconnect', function(peer) {
    //console.log('detected peer disconnect');
  });
};

module.exports.stop = function(){};
