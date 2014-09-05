module.exports = {
  VERSION: {
    args: [
      {name: 'version', size: 4}, // protocol version
      {name: 'agent', type: 'varbuf', maxlen: 100}, // string indicating agent type
      {name: 'identity', size: 20}, // hash of pubkey of the node
      {name: 'services', size: 8}, // bitfield indicating the services supported 
      {name: 'settings', size: 8}, // bitfield for various settings
      {name: 'timestamp', size: 8},
      {name: 'addrRecv', size: 26},
      {name: 'addrFrom', size: 26}]},
  VERACK: {},

  // the methods below are connection specific and use an id to minimize
  // the size of messages (instead of a 12 byte command)
  CONNECT: {id: 1,
    args: [
      {name: 'connectionId', size: 20}]},
  GETCONNECTINFO: {id: 2,
    args: [
      {name: 'connectionId', size: 20}]},
  CONNECTINFO: {id: 3,
    args: [
      {name: 'address', size: 33},
      {name: 'nonce', size: 8},
      {name: 'credentials', type: 'varbuf'}]},
  CONNECTACK: {id: 4,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'signature', type: 'varbuf'},
      {name: 'preMaster', type: 'varbuf'}]},
  CONNECTED: {id: 5,
    args: [
      {name: 'connectionId', size: 20}]},
  SENDDEST: {id: 6,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'data', type: 'varbuf'}]},
  SENDORIG: {id: 7,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'data', type: 'varbuf'}]},
  ENDDEST: {id: 8,
    args: [
      {name: 'connectionId', size: 20}]},
  ENDORIG: {id: 9,
    args: [
      {name: 'connectionId', size: 20}]}
};
