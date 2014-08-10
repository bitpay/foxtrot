function DeliveryAgent() {
  this.message = null;
  this.start = null;
  this.stages = [];
  this.timeout = 2000;  // timeout in ms
  this.results = [];
  this.ackLimit = 3; // number of acks before we stop delivering 
};

DeliveryAgent.prototype.addStage = function(delay, peers) {
  this.stages.push({t: delay, peers: peers});
  this.stages.sort(function(a, b) {
    return a.t < b.t ? -1 : 1;
  });
};

DeliveryAgent.prototype.deliver = function() {
  this.start = new Date();
};


module.exports = DeliveryAgent;
