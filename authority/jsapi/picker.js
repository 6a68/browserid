// this is the picker code!  it runs in the identity provider's domain, and
// fiddles the dom expressed by picker.html
(function() {
  var chan = Channel.build(
    {
      window: window.opener,
      origin: "*",
      scope: "mozid"
    });

  function runIDsDialog(cb) {
    // iterate over all of the available identities and add a links to them
    var list = document.getElementById('identities');

    var first = true;
    [ "foo@bar.com", "baz@bing.com" ].forEach(function(i) {
      var div = document.createElement("div");
      var button = document.createElement("input");
      button.setAttribute('type', 'radio');
      button.checked = first;
      first = false;
      button.name = "id_selection";
      button.value = i;
      div.appendChild(button);
      var label = document.createElement("div");
      label.innerText = i;
      label.addEventListener("click", function(evt) {
        console.log("clicked label: ");
        this.parentNode.firstChild.checked = true;
      });
      div.appendChild(label);
      list.appendChild(div);
    });

    // now make the body visible...
    document.getElementById("body").style.display = "block";

    document.getElementById('signin').addEventListener("click", function(evt) {
      var is = document.forms["identities"].elements['id_selection'];
      var id = undefined;
      for (var i = 0; i < is.length; i++) {
        if (is[i].checked) {
          id = is[i].value;
          break;
        }
      }
      if (id) {
        trans.complete(id);
        window.self.close();
      } else {
        trans.error("noSelection", "no id selected by user");
        window.self.close();
      }
    });

    document.getElementById('cancel').addEventListener("click", function(evt) {
      trans.error("noSelection", "no id selected by user");
      window.self.close();
    });
  }

  function runDefaultDialog(onsuccess, onerror) {
    $(".dialog").hide();

    $("#back").hide();
    $("#cancel").show().unbind('click').click(function() {
      onerror("canceled");
    });
    $("#submit").show().unbind('click').click(function() {
      onerror("notImplemented");
    }).text("Sign In");
    $("#default_dialog div.note > a").unbind('click').click(function() {
      onerror("notImplemented");
    });
    $("#default_dialog div.note > a").unbind('click').click(function() {
      onerror("notImplemented");
    });
    $("#default_dialog div.actions div.action").unbind('click').click(function() {
      runCreateDialog(onsuccess, onerror);
    });
    $("#default_dialog").fadeIn(500);
  }

  // a handle to a timeout of a running email check
  var emailCheckState = undefined;
  // the next email to check, if one is entered while a check is running
  var nextEmailToCheck = undefined;
  // a set of emails that we've checked for this session
  var checkedEmails = {

  };

  function runConfirmEmailDialog(email, onsuccess, onerror) {
    $(".dialog").hide();

    $("span.email").text(email);

    // XXX: till we implement email confirmation, this is a faked up step.  just wait 5s
    var fakeyTimeout = setTimeout(function() {
      runConfirmedEmailDialog(email, onsuccess, onerror);
    }, 5000);

    $("#back").show().unbind('click').click(function() {
      window.clearTimeout(fakeyTimeout);
      runCreateDialog(onsuccess, onerror);
    });

    $("#cancel").show().unbind('click').click(function() {
      window.clearTimeout(fakeyTimeout);
      onerror("canceled");
    });
    $("#submit").hide();

    $("#create_email_dialog div.actions div.action a").unbind('click').click(function() {
      // XXX: resend the email!
      return true;
    });
    $("#confirm_email_dialog").fadeIn(500);

  }

  function runConfirmedEmailDialog(email, onsuccess, onerror) {
    $(".dialog").hide();

    $("span.email").text(email);

    $("#back").hide();

    $("#cancel").show().unbind('click').click(function() {
      onerror("canceled");
    });
    $("#submit").show().unbind('click').click(function() {
      runIDsDialog(onsuccess, onerror);
    }).text("Continue");

    $("#confirmed_email_dialog").show();
  }

  function runCreateDialog(onsuccess, onerror) {
    $(".dialog").hide();

    $("#back").show().unbind('click').click(function() {
      runDefaultDialog(onsuccess, onerror);
    });
    $("#cancel").show().unbind('click').click(function() {
      onerror("canceled");
    });
    $("#submit").show().unbind('click').click(function() {
      // ignore the click if we're disabled
      if ($(this).hasClass('disabled')) return true;

      // user wishes to create a firefox ID!  now let's validate the email flow
      runConfirmEmailDialog($("#create_dialog input:eq(0)").val(), onsuccess, onerror);
    }).text("Continue").addClass("disabled");


    function checkInput() {
      $("#submit").removeClass("disabled");

      // check the email address
      var email = $("#create_dialog input:eq(0)").val();
      if (typeof email === 'string' && email.length) {
        var valid = checkedEmails[email];
        if (typeof valid === 'boolean') {
          if (valid) {
            $("#create_dialog div.note:eq(0)").html($('<span class="good"/>').text("Email is valid"));
          } else {
            $("#create_dialog div.note:eq(0)").html($('<span class="bad"/>').text("Email in use"));
            $("#submit").addClass("disabled");
          }
        } else {
          // this is an email that needs to be checked!
          if (emailCheckState !== 'querying') {
            if (emailCheckState) window.clearTimeout(emailCheckState);
            emailCheckState = setTimeout(function() {
              // XXX: this is where we should actually bounce off the server and enter the 'querying' state
              // for now, we just call it valid
              checkedEmails[nextEmailToCheck] = true;
              emailCheckState = undefined;
              checkInput();
            }, 500);
          }
          nextEmailToCheck = email;
          $("#submit").addClass("disabled");
          $("#create_dialog div.note:eq(0)").html($('<span class="warning"/>').text("Checking address"));
        }
      } else {
        $("#create_dialog div.note:eq(0)").empty();
        $("#submit").addClass("disabled");
      }

      // next let's check the password entry
      var pass = $("#create_dialog input:eq(1)").val();
      var match = pass === $("#create_dialog input:eq(2)").val();
      if (!match) {
        $("#submit").addClass("disabled");
        $("#create_dialog div.note:eq(1)").html($('<span class="bad"/>').text("Passwords different"));
      } else {
        if (!pass) {
          $("#submit").addClass("disabled");
          $("#create_dialog div.note:eq(1)").html($('<span class="bad"/>').text("Enter a password"));
        } else if (pass.length < 5) {
          $("#submit").addClass("disabled");
          $("#create_dialog div.note:eq(1)").html($('<span class="bad"/>').text("Password too short"));
        } else {
          $("#create_dialog div.note:eq(1)").html($('<span class="good"/>').text("Password OK"))
        }
      }
    }

    // watch input dialogs
    $("#create_dialog input:first").unbind('keyup').bind('keyup', function() {
      checkInput();
    });

    $("#create_dialog input:gt(0)").unbind('keyup').bind('keyup', checkInput);

    // do a check at load time, in case the user is using the back button (enables the continue button!)
    checkInput();

    $("#create_dialog").fadeIn(500);
  }

  runCreateDialog();

  function errorOut(trans, code) {
    function getVerboseMessage(code) {
      var msgs = {
        "canceled": "user canceled selection",
        "notImplemented": "the user tried to invoke behavior that's not yet implemented"
      };
      var msg = msgs[code];
      if (!msg) {
        alert("need verbose message for " + code); 
        msg = "unknown error"
      }
      return msg;
    }
    trans.error(code, getVerboseMessage(code));
    window.self.close();
  }

  chan.bind("getVerifiedEmail", function(trans, s) {
    trans.delayReturn(true);

    // set the requesting site
    $(".sitename").text(trans.origin.replace(/^.*:\/\//, ""));

    // XXX: check to see if there's any pubkeys stored in the browser
    var haveIDs = false;

    if (haveIDs) {
      runIDsDialog(function(rv) {
        trans.complete(rv);
      }, function(error) {
        errorOut(trans, error);
      });
    } else {
      runDefaultDialog(function(rv) {
        trans.complete(rv);
      }, function(error) {
        errorOut(trans, error);
      });
    }
  });
})();