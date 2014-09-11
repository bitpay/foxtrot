var defaultNode;
module.exports.options = null;
function node() {
  defaultNode = defaultNode || require('./lib/Router')(module.exports.options);
  return defaultNode;
};

var requireWhenAccessed = function(names) {
  for(var i=0; i<names.length; i++) {
    (function(entry) {
      var name = entry[0];
      var file = entry[1];
      Object.defineProperty(exports, name, {
        get: function() {
          return require(file)
        }
      });
    })(names[i]);
  }
};

var functions = {};
function getFunction(name) {
  //functions[name] = functions[name] || node()[name].bind(node());
  functions[name] = functions[name] || function() {return node()[name].apply(node(), arguments);};
  return functions[name];
};

var bindWhenAccessed = function(names) {
  for(var i=0; i<names.length; i++) {
    (function(name) {
      Object.defineProperty(exports, name, {
        get: function() {
          return getFunction(name);
        }
      });
    })(names[i]);
  }
};

bindWhenAccessed([
  'listenForPeers',
  'connectToPeer',
  'addPeer',
  'setupPeering',
  'createServer',
  'connect',
  'newKey',
  'on',
  'stop'
]);

requireWhenAccessed([
  ['Router', './lib/Router'],
  ['Peer', './lib/Peer'],
  ['AESSocket', './lib/AESSocket'],
  ['KeyExchanger', './lib/KeyExchanger']
]);

Object.defineProperty(exports, 'tracer', {
  get: function() {
    return node().tracer;
  },
  set: function(value) {
    require('./lib/Router').tracer = value;
  }
});
