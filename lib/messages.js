module.exports = {
  CONNECT: {id: 0,
    args: [
      {name: 'connectionId', size: 20}]},
  GETCONNECTINFO: {id: 1,
    args: [
      {name: 'connectionId', size: 20}]},
  CONNECTINFO: {id: 2,
    args: [
      {name: 'address', size: 33},
      {name: 'nonce', size: 8},
      {name: 'credentials', type: 'varbuf'}]},
  CONNECTACK: {id: 3,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'signature', type: 'varbuf'},
      {name: 'preMaster', type: 'varbuf'}]},
  CONNECTED: {id: 4,
    args: [
      {name: 'connectionId', size: 20}]},
  SENDDEST: {id: 5,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'data', type: 'varbuf'}]},
  SENDORIG: {id: 6,
    args: [
      {name: 'connectionId', size: 20},
      {name: 'data', type: 'varbuf'}]},
  ENDDEST: {id: 7,
    args: [
      {name: 'connectionId', size: 20}]},
  ENDORIG: {id: 8,
    args: [
      {name: 'connectionId', size: 20}]}
};
