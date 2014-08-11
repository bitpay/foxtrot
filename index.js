var defaultNode;
function node() {
  defaultNode = defaultNode || require('./lib/Router')();
  return defaultNode;
};

var requireWhenAccessed = function(names) {
  for(var i=0; i<names.length; i++) {
    var name = names[i][0];
    var file = names[i][1];
    Object.defineProperty(exports, name, {
      get: function() {
        return require(file)
      }
    });
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
  'on'
]);

requireWhenAccessed([
  ['Router', './lib/Router'],
  ['AESSocket', './lib/AESSocket']
]);

Object.defineProperty(exports, 'tracer', {
  get: function() {
    return node().tracer;
  },
  set: function(value) {
    require('./lib/Router').tracer = value;
  }
});
