(function() {
  "use strict";

  PageController.extend("Authenticate", {}, {
      init: function() {
        this._super({
          bodyTemplate: "authenticate.ejs",
          bodyVars: {
            sitename: BrowserIDNetwork.origin
          },
          footerTemplate: "bottom-signin.ejs",
          footerVars: {}
        });
      },

      validate: function() {
        var email = $("#email_input").val();
        var pass = $("#password_input").val();

        return true;
      },

      submit: function() {
        var email = $("#email_input").val();
        var pass = $("#password_input").val();

        var self = this;
        BrowserIDNetwork.authenticate(email, pass, function(authenticated) {
          if (!authenticated) {
            self.find("#nosuchaccount").hide().fadeIn(400);
          } else {
            self.close("authenticate:authenticated");
          }
        }, function(resp) {
          self.runErrorDialog(BrowserIDErrors.authentication);
          self.close("cancel");
        });
      }
  });

}());
