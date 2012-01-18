/*jshint browsers:true, forin: true, laxbreak: true */
/*global test: true, start: true, stop: true, module: true, ok: true, equal: true, BrowserID:true */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla BrowserID.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
(function() {
  "use strict";

  var controller,
      bid = BrowserID,
      xhr = bid.Mocks.xhr,
      user = bid.User,
      storage = bid.Storage,
      testHelpers = bid.TestHelpers,
      register = testHelpers.register,
      provisioning = bid.Mocks.Provisioning;


  module("controllers/required_email", {
    setup: function() {
      testHelpers.setup();
      $("#required_email").text("");
    },

    teardown: function() {
      if (controller) {
        try {
          controller.destroy();
        } catch(e) {
          // controller may have already been deleted.
        }
        controller = null;
      }
      testHelpers.setup();
    }
  });

  function createController(options) {
    controller = bid.Modules.RequiredEmail.create();
    controller.start(options);
  }

  function testSignIn(email, cb) {
    var el = $("#required_email");
    equal(el.val() || el.text(), email, "email set correctly");
    equal($("#sign_in").length, 1, "sign in button shown");
    equal($("#verify_address").length, 0, "verify address not shows");
    cb && cb();
    start();
  }

  function testVerify(email, cb) {
    var el = $("#required_email");
    equal(el.val() || el.text(), email, "email set correctly");
    equal($("#sign_in").length, 0, "sign in button not shown");
    equal($("#verify_address").length, 1, "verify address shows");
    testNoPasswordSection();
    cb && cb();
    start();
  }

  function testPasswordSection() {
    equal($("#password_section").length, 1, "password section is there");
  }

  function testNoPasswordSection() {
    equal($("#password_section").length, 0, "password section is not there");
  }

  asyncTest("known_secondary: user who is not authenticated - show password form", function() {
    var email = "registered@testuser.com";
    xhr.useResult("known_secondary");

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        testSignIn(email, testPasswordSection);
      }
    });

  });

  asyncTest("unknown_secondary: user who is not authenticated - user must verify", function() {
    var email = "unregistered@testuser.com";
    xhr.useResult("unknown_secondary");

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        testVerify(email);
      }
    });
  });

  asyncTest("primary: user who is authenticated, owns address, cert valid - sees signin screen", function() {
    var email = "testuser@testuser.com";

    storage.addEmail(email, { type: "primary", cert: "cert" });
    createController({
      email: email,
      authenticated: true,
      ready: function() {
        testSignIn(email);
      }
    });

  });

  asyncTest("primary: user who is authenticated, owns address, cert expired or invalid - redirected to 'primary_user'", function() {
    var email = "registered@testuser.com",
        msgInfo;

    storage.addEmail(email, { type: "primary" });

    register("primary_user", function(msg, info) {
      msgInfo = info;
    });

    createController({
      email: email,
      authenticated: true,
      ready: function() {
        equal(msgInfo.email, email, "correct email passed");
        start();
      }
    });
  });

  asyncTest("primary: user who is authenticated, does not own address - redirected to 'primary_user'", function() {
    var email = "unregistered@testuser.com",
        msgInfo;

    xhr.useResult("primary");
    provisioning.setStatus(provisioning.NOT_AUTHENTICATED);

    register("primary_user", function(msg, info) {
      msgInfo = info;
    });

    createController({
      email: email,
      authenticated: true,
      ready: function() {
        equal(msgInfo.email, email, "correct email passed");
        start();
      }
    });
  });

  asyncTest("primary: user who is not authenticated, authenticated with IdP - user sees sign in screen.", function() {
    var email = "unregistered@testuser.com";
    xhr.useResult("primary");
    provisioning.setStatus(provisioning.AUTHENTICATED);

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        testSignIn(email, testNoPasswordSection);
      }
    });
  });

  asyncTest("primary: user who is not authenticated, not authenticated with IdP - redirects to 'primary_user'", function() {
    var email = "unregistered@testuser.com",
        msgInfo;

    register("primary_user", function(msg, info) {
      msgInfo = info;
    });

    xhr.useResult("primary");
    provisioning.setStatus(provisioning.NOT_AUTHENTICATED);

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        equal(msgInfo && msgInfo.email, "unregistered@testuser.com", "correct email address");
        start();
      }
    });
  });

  asyncTest("user who is not authenticated, XHR error", function() {
    xhr.useResult("ajaxError");
    var email = "registered@testuser.com";
    createController({
      email: email,
      authenticated: false,
      ready: function() {
        ok(testHelpers.errorVisible(), "Error message is visible");
        start();
      }
    });
  });

  asyncTest("known_secondary: user who is authenticated, email belongs to user - user sees sign in screen.", function() {
    xhr.setContextInfo({
      authenticated: true
    });

    var email = "registered@testuser.com";
    user.syncEmailKeypair(email, function() {
      createController({
        email: email,
        authenticated: true,
        ready: function() {
          testSignIn(email, testNoPasswordSection);
        }
      });
    });
  });

  asyncTest("known_secondary: user who is authenticated, email belongs to another user - user sees verify screen", function() {
    xhr.setContextInfo({
      authenticated: true
    });

    var email = "registered@testuser.com";
    xhr.useResult("known_secondary");

    createController({
      email: email,
      authenticated: true,
      ready: function() {
        // This means the current user is going to take the address from the other
        // account.
        testVerify(email);
      }
    });
  });

  asyncTest("unknown_secondary: user who is authenticated, but email unknown - user sees verify screen", function() {
    xhr.setContextInfo({
      authenticated: true
    });
    xhr.useResult("unknown_secondary");

    var email = "unregistered@testuser.com";

    createController({
      email: email,
      authenticated: true,
      ready: function() {
        testVerify(email);
      }
    });
  });


  asyncTest("secondary: signIn of an authenticated user - generates an assertion, redirects to assertion_generated", function() {
    xhr.setContextInfo({
      authenticated: true
    });

    var email = "registered@testuser.com";
    user.syncEmailKeypair(email, function() {
      createController({
        email: email,
        authenticated: true
      });

      register("assertion_generated", function(item, info) {
        ok(info.assertion, "we have an assertion");
        start();
      });

      controller.signIn();
    });
  });

  asyncTest("secondary: signIn of a non-authenticated user with a good password - generates an assertion, redirects to assertion_generated", function() {
    xhr.setContextInfo({
      authenticated: false
    });

    var email = "registered@testuser.com";
    xhr.useResult("known_secondary");

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        register("assertion_generated", function(item, info) {
          ok(info.assertion, "we have an assertion");
          start();
        });

        xhr.useResult("valid");

        $("#password").val("password");
        controller.signIn();
      }
    });

  });


  asyncTest("secondary: signIn of a non-authenticated user with a bad password does not generate an assertion", function() {
    xhr.setContextInfo({
      authenticated: false
    });

    var email = "registered@testuser.com";
    xhr.useResult("known_secondary");

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        var assertion;

        register("assertion_generated", function(item, info) {
          ok(false, "this should not have been called");
          assertion = info.assertion;
        });

        xhr.useResult("invalid");
        $("#password").val("badpassword");
        controller.signIn(function() {
          // Since we are using the mock, we know the XHR result is going to be
          // back in less than 1000ms.  All we have to do is check whether an
          // assertion was generated, if so, bad jiji.
          equal(typeof assertion, "undefined", "assertion was never generated");
          start();
        });
      }
    });
  });

  asyncTest("primary: signIn of an non-authenticated user who is authenticated w/ IdP - redirects to 'primary_user'", function() {
    xhr.useResult("primary");
    provisioning.setStatus(provisioning.AUTHENTICATED);
    var email = "unregistered@testuser.com";

    createController({
      email: email,
      authenticated: false,
      ready: function() {
        var primaryEmail;

        register("primary_user", function(item, info) {
          primaryEmail = info.email;
        });

        controller.signIn(function() {
          equal(primaryEmail, email, "correct email passed to primary_user");
          start();
        });
      }
    });

  });

  function testMessageReceived(email, message) {
    var authenticated = true;

    xhr.setContextInfo({
      authenticated: authenticated
    });

    createController({
      email: email,
      authenticated: authenticated,
      ready: function() {
        register(message, function(item, info) {
          equal(info.email, email, message + " received with correct email");
          start();
        });

        controller.verifyAddress();
      }
    });
  }

  asyncTest("verifyAddress of authenticated user, address belongs to another user - redirects to 'email_staged'", function() {
    var email = "registered@testuser.com";
    xhr.useResult("known_secondary");

    testMessageReceived(email, "email_staged");
  });

  asyncTest("verifyAddress of authenticated user, unknown address - redirects to 'email_staged'", function() {
    var email = "unregistered@testuser.com";
    xhr.useResult("unknown_secondary");

    testMessageReceived(email, "email_staged");
  });

  asyncTest("verifyAddress of un-authenticated user, forgot password - redirect to 'forgot_password'", function() {
    var email = "registered@testuser.com",
        authenticated = false,
        message = "forgot_password";

    xhr.setContextInfo({
      authenticated: authenticated
    });

    createController({
      email: email,
      authenticated: authenticated,
      ready: function() {
        register(message, function(item, info) {
          equal(info.email, email, message + " received with correct email");
          start();
        });

        controller.forgotPassword();
      }
    });
  });

  asyncTest("cancel raises the cancel message", function() {
    var email = "registered@testuser.com",
        message = "cancel",
        authenticated = false;

    xhr.setContextInfo({
      authenticated: authenticated
    });

    createController({
      email: email,
      authenticated: authenticated,
      ready: function() {
        register(message, function(item, info) {
          ok(true, message + " received");
          start();
        });

        controller.cancel();
      }
    });
  });

}());

