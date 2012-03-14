/*jshint browser:true, jQuery: true, forin: true, laxbreak:true */
/*global BrowserID:true, PageController: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
BrowserID.Modules.IsThisYourComputer = (function() {
  "use strict";

  var bid = BrowserID,
      user = bid.User,
      network = bid.Network,
      storage = bid.Storage,
      errors = bid.Errors;

  var Module = bid.Modules.PageModule.extend({
    start: function(options) {
      options = options || {};

      var self = this,
          complete = function(status) {
            options.ready && options.ready(status || false);
          };

      self.renderDialog("is_this_your_computer", options);

      Module.sc.start.call(self, options);
    }
  });

  return Module;

}());
