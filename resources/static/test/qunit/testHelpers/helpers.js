(function() {
  var bid = BrowserID,
      mediator = bid.Mediator,
      network = bid.Network,
      storage = bid.Storage,
      xhr = bid.Mocks.xhr,
      registrations = [];
      calls = {};

  function register(message, cb) {
    registrations.push(mediator.subscribe(message, function(msg, info) {
      if(calls[msg]) {
        throw msg + " triggered more than once";
      }
      calls[msg] = true;

      cb(msg, info);
    }));
  }

  function unregisterAll() {
    var registration;
    for(var i = 0, registration; registration = registrations[i]; ++i) {
      mediator.unsubscribe(registration);
    }
    registrations = [];
    calls = {};
  }

  BrowserID.TestHelpers = {
    setup: function() {
      network.setXHR(xhr);
      xhr.useResult("valid");
      storage.clear();

      var el = $("#controller_head");
      el.find("#formWrap .contents").html("");
      el.find("#wait .contents").html("");
      $("#error").html("<div class='contents'></div>").hide();

      unregisterAll();
      mediator.reset();
    },

    teardown: function() {
      unregisterAll();
      mediator.reset();
      network.setXHR($);
      storage.clear();
      $("#error").html("<div class='contents'></div>").hide();
    },

    register: register
  };
}());
