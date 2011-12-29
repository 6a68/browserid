/*jshint browsers:true, forin: true, laxbreak: true */
/*global _: true, BrowserID: true, console: true */
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

BrowserID.User = (function() {
  "use strict";

  var jwk, jwt, vep, jwcert, origin,
      bid = BrowserID,
      network = bid.Network,
      storage = bid.Storage,
      User, pollTimeout,
      provisioning = bid.Provisioning;

  function prepareDeps() {
    if (!jwk) {
      jwk= require("./jwk");
      jwt = require("./jwt");
      vep = require("./vep");
      jwcert = require("./jwcert");
    }
  }

  // remove identities that are no longer valid
  function cleanupIdentities(cb) {
    network.serverTime(function(serverTime) {
      network.domainKeyCreationTime(function(creationTime) {
        // Determine if a certificate is expired.  That will be
        // if it was issued *before* the domain key was last updated or
        // if the certificate expires in less that 5 minutes from now.
        function isExpired(cert) {
          // if it expires in less than 5 minutes, it's too old to use.
          var diff = cert.expires.valueOf() - serverTime.valueOf();
          if (diff < (60 * 5 * 1000)) {
            return true;
          }

          // or if it was issued before the last time the domain key
          // was updated, it's invalid
          if (!cert.issued_at || cert.issued_at < creationTime) {
            return true;
          }

          return false;
        }

        var emails = storage.getEmails();
        var issued_identities = {};
        prepareDeps();
        _(emails).each(function(email_obj, email_address) {
          try {
            email_obj.pub = jwk.PublicKey.fromSimpleObject(email_obj.pub);
          } catch (x) {
            storage.invalidateEmail(email_address);
            return;
          }

          // no cert? reset
          if (!email_obj.cert) {
            storage.invalidateEmail(email_address);
          } else {
            try {
              // parse the cert
              var cert = new jwcert.JWCert();
              cert.parse(emails[email_address].cert);

              // check if this certificate is still valid.
              if (isExpired(cert)) {
                storage.invalidateEmail(email_address);
              }

            } catch (e) {
              // error parsing the certificate!  Maybe it's of an old/different
              // format?  just delete it.
              try { console.log("error parsing cert for", email_address ,":", e); } catch(e2) { }
              storage.invalidateEmail(email_address);
            }
          }
        });
        cb();
      }, function(e) {
        // we couldn't get domain key creation time!  uh oh.
        cb();
      });
    });
  }

  function setAuthenticationStatus(authenticated) {
    var func = authenticated ? 'addClass' : 'removeClass';
    $('body')[func]('authenticated');

    if (!authenticated) {
      storage.clear();
    }
  }

  function registrationPoll(checkFunc, email, onSuccess, onFailure) {
    function poll() {
      checkFunc(email, function(status) {
        // registration status checks the status of the last initiated registration,
        // it's possible return values are:
        //   'complete' - registration has been completed
        //   'pending'  - a registration is in progress
        //   'mustAuth' - user must authenticate
        //   'noRegistration' - no registration is in progress
        if (status === "complete" || status === "mustAuth") {
          // As soon as the registration comes back as complete, we should
          // ensure that the stagedOnBehalfOf is cleared so there is no stale
          // data.
          storage.setStagedOnBehalfOf("");
          if (onSuccess) {
            onSuccess(status);
          }
        }
        else if (status === 'pending') {
          pollTimeout = setTimeout(poll, 3000);
        }
        else if (onFailure) {
            onFailure(status);
        }
      }, onFailure);
    }

    poll();
  }

  function cancelRegistrationPoll() {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
  }

  function checkEmailType(type) {
    if (type !== 'secondary' && type !== 'primary')
      throw "invalid email type (should be 'secondary' or 'primary'): " + type;
  }

  /**
   * Persist an address and key pair locally.
   * @method persistEmailKeypair
   * @param {string} email - Email address to persist.
   * @param {object} keypair - Key pair to save
   * @param {function} [onComplete] - Called on successful completion.
   * @param {function} [onFailure] - Called on error.
   */
  function persistEmailKeypair(email, type, keypair, cert, onComplete, onFailure) {
    checkEmailType(type);
    var now = new Date();
    var email_obj = storage.getEmails()[email] || {
      created: now,
      type: type
    };

    _.extend(email_obj, {
      updated: now,
      pub: keypair.publicKey.toSimpleObject(),
      priv: keypair.secretKey.toSimpleObject(),
      cert: cert
    });

    storage.addEmail(email, email_obj);
    if(onComplete) onComplete(true);
  }

  /**
   * Certify an identity with the server, persist it to storage if the server
   * says the identity is good
   * @method certifyEmailKeypair
   */
  function certifyEmailKeypair(email, keypair, onComplete, onFailure) {
    network.certKey(email, keypair.publicKey, function(cert) {
      // emails that *we* certify are always secondary emails
      persistEmailKeypair(email, "secondary", keypair, cert, onComplete, onFailure);
    }, onFailure);
  }

  /**
   * Persist an email address without a keypair
   * @method persistEmail
   * @param {string} email - Email address to persist.
   * @param {string} type - Is the email a 'primary' or a 'secondary' address?
   * @param {function} [onComplete] - Called on successful completion.
   * @param {function} [onFailure] - Called on error.
   */
  function persistEmail(email, type, onComplete, onFailure) {
    checkEmailType(type);
    storage.addEmail(email, {
      created: new Date(),
      type: type
    });

    if(onComplete) onComplete(true);
  }

  User = {
    init: function(config) {
      if(config.provisioning) {
        provisioning = config.provisioning;
      }
    },

    reset: function() {
      provisioning = BrowserID.Provisioning;
    },

    /**
     * Set the interface to use for networking.  Used for unit testing.
     * @method setNetwork
     * @param {BrowserID.Network} networkInterface - BrowserID.Network
     * compatible interface to use.
     */
    setNetwork: function(networkInterface) {
      network = networkInterface;
    },

    /**
     * setOrigin
     * @method setOrigin
     * @param {string} origin
     */
    setOrigin: function(originArg) {
      origin = originArg;
    },

    /**
     * Get the origin of the current host being signed in to.
     * @method getOrigin
     * @return {string} origin
     */
    getOrigin: function() {
      return origin;
    },

    /**
     * Get the hostname for the set origin
     * @method getHostname
     * @returns {string}
     */
    getHostname: function() {
      return origin.replace(/^.*:\/\//, "").replace(/:\d*$/, "");
    },

    /**
     * Create a user account - this creates an user account that must be verified.
     * @method createSecondaryUser
     * @param {string} email - Email address.
     * @param {function} [onComplete] - Called on completion.
     * @param {function} [onFailure] - Called on error.
     */
    createSecondaryUser: function(email, onComplete, onFailure) {
      var self=this;

      // remember this for later
      storage.setStagedOnBehalfOf(self.getHostname());

      network.createUser(email, origin, onComplete, onFailure);
    },

    /**
     * Create a user.  Works for both primaries and secondaries.
     * @method createUser
     * @param {string} email
     * @param {function} onComplete - function to call on complettion.  Called
     * with two parameters - status and info.
     * Status can be:
     *  secondary.already_added
     *  secondary.verify
     *  secondary.could_not_add
     *  primary.already_added
     *  primary.verified
     *  primary.verify
     *  primary.could_not_add
     *
     *  info is passed on primary.verify and contains the info necessary to
     *  verify the user with the IdP
     */
    createUser: function(email, onComplete, onFailure) {
      var self=this;

      network.addressInfo(email, function(info) {
        User.createUserWithInfo(email, info, onComplete, onFailure);
      }, onFailure);
    },

    /**
     * Attempt to create a user with the info returned from
     * network.addressInfo.  Attempts to create both primary and secondary
     * based users depending on info.type.
     * @method createUserWithInfo
     * @param {string} email
     * @param {object} info - contains fields returned from network.addressInfo
     * @param {function} [onComplete]
     * @param {function} [onFailure]
     */
    createUserWithInfo: function(email, info, onComplete, onFailure) {
      var self=this;
      function attemptAddSecondary(email, info) {
        if (info.known) {
          onComplete("secondary.already_added");
        }
        else {
          self.createSecondaryUser(email, function(success) {
            if(success) {
              onComplete("secondary.verify");
            }
            else {
              onComplete("secondary.could_not_add");
            }
          }, onFailure);
        }
      }

      function attemptAddPrimary(email, info) {
        User.provisionPrimaryUser(email, info, function(status, provInfo) {
          if(status === "primary.verified") {
            network.authenticateWithAssertion(email, provInfo.assertion, function(status) {
              if(status) {
                onComplete("primary.verified");
              }
              else {
                onComplete("primary.could_not_add");
              }
            }, onFailure);
          }
          else {
            onComplete(status, provInfo);
          }
        }, onFailure);
      }

      if (info.type === 'secondary') {
        attemptAddSecondary(email, info);
      } else {
        attemptAddPrimary(email, info);
      }
    },

    provisionPrimaryUser: function(email, info, onComplete, onFailure) {
      provisioning({
        email: email,
        url: info.prov
      }, function(keypair, cert) {
        persistEmailKeypair(email, "primary", keypair, cert, function() {
          // We are getting an assertion for browserid.org.
          User.getAssertion(email, "https://browserid.org", function(assertion) {
            if(assertion) {
              onComplete("primary.verified", {
                assertion: assertion
              });
            }
            else {
              // XXX change this to could_not_provision
              onComplete("primary.could_not_add");
            }
          }, onFailure);
        }, onFailure);
      }, function(error) {
        if(error.code === "primaryError" && error.msg === "user is not authenticated as target user") {
          onComplete("primary.verify", info);
        }
        else {
          onFailure(info);
        }
      });
    },

    /**
     * Poll the server until user registration is complete.
     * @method waitForUserValidation
     * @param {string} email - email address to check.
     * @param {function} [onSuccess] - Called to give status updates.
     * @param {function} [onFailure] - Called on error.
     */
    waitForUserValidation: function(email, onSuccess, onFailure) {
      registrationPoll(network.checkUserRegistration, email, onSuccess, onFailure);
    },

    /**
     * Cancel the waitForUserValidation poll
     * @method cancelUserValidation
     */
    cancelUserValidation: function() {
      cancelRegistrationPoll();
    },

    /**
     * Verify a user
     * @method verifyUser
     * @param {string} token - token to verify.
     * @param {string} password - password to set for account.
     * @param {function} [onSuccess] - Called to give status updates.
     * @param {function} [onFailure] - Called on error.
     */
    verifyUser: function(token, password, onSuccess, onFailure) {
      network.emailForVerificationToken(token, function (email) {
        var invalidInfo = { valid: false };
        if (email) {
          network.completeUserRegistration(token, password, function (valid) {
            var info = valid ? {
              valid: valid,
              email: email,
              origin: storage.getStagedOnBehalfOf()
            } : invalidInfo;

            storage.setStagedOnBehalfOf("");

            if (onSuccess) onSuccess(info);
          }, onFailure);
        } else if (onSuccess) {
          onSuccess(invalidInfo);
        }
      }, onFailure);
    },

    /**
     * Set the initial password of the current user.
     * @method setPassword
     * @param {string} password - password to set
     * @param {function} [onComplete] - Called on successful completion.
     * @param {function} [onFailure] - Called on error.
     */
    setPassword: function(password, onComplete, onFailure) {
      network.setPassword(password, onComplete, onFailure);
    },

    /**
     * update the password of the current user.
     * @method changePassword
     * @param {string} oldpassword - the old password.
     * @param {string} newpassword - the new password.
     * @param {function} [onComplete] - called on completion.  Called with one
     * parameter, status - set to true if password update is successful, false
     * otw.
     * @param {function} [onFailure] - called on XHR failure.
     */
    changePassword: function(oldpassword, newpassword, onComplete, onFailure) {
      network.changePassword(oldpassword, newpassword, onComplete, onFailure);
    },

    /**
     * Request a password reset for the given email address.
     * @method requestPasswordReset
     * @param {string} email - email address to reset password for.
     * @param {function} [onComplete] - Callback to call when complete, called
     * with a single object, info.
     *    info.status {boolean} - true or false whether request was successful.
     *    info.reason {string} - if status false, reason of failure.
     * @param {function} [onFailure] - Called on XHR failure.
     */
    requestPasswordReset: function(email, onComplete, onFailure) {
      this.isEmailRegistered(email, function(registered) {
        if (registered) {
          network.requestPasswordReset(email, origin, function(reset) {
            var status = {
              success: reset
            };

            if (!reset) status.reason = "throttle";

            if (onComplete) onComplete(status);
          }, onFailure);
        }
        else if (onComplete) {
          onComplete({ success: false, reason: "invalid_user" });
        }
      }, onFailure);
    },

    /**
     * Cancel the current user's account.  Remove last traces of their
     * identity.
     * @method cancelUser
     * @param {function} [onComplete] - Called whenever complete.
     * @param {function} [onFailure] - called on error.
     */
    cancelUser: function(onComplete, onFailure) {
      network.cancelUser(function() {
        setAuthenticationStatus(false);
        if (onComplete) {
          onComplete();
        }
      }, onFailure);

    },

    /**
     * Log the current user out.
     * @method logoutUser
     * @param {function} [onSuccess] - Called whenever complete.
     * @param {function} [onFailure] - called on error.
     */
    logoutUser: function(onSuccess, onFailure) {
      network.logout(function() {
        setAuthenticationStatus(false);
        if (onSuccess) {
          onSuccess();
        }
      }, onFailure);
    },

    /**
     * Sync local identities with browserid.org.  Generally should not need to
     * be called.
     * @method syncEmails
     * @param {function} [onSuccess] - Called whenever complete.
     * @param {function} [onFailure] - Called on error.
     */
    syncEmails: function(onSuccess, onFailure) {
      var self = this;

      cleanupIdentities(function () {
        var issued_identities = self.getStoredEmailKeypairs();

        network.listEmails(function(emails) {
          // lists of emails
          var client_emails = _.keys(issued_identities);
          var server_emails = _.keys(emails);

          var emails_to_add = _.difference(server_emails, client_emails);
          var emails_to_remove = _.difference(client_emails, server_emails);

          // remove emails
          _.each(emails_to_remove, function(email) {
            storage.removeEmail(email);
          });

          // keygen for new emails
          // asynchronous
          function addNextEmail() {
            if (!emails_to_add || !emails_to_add.length) {
              onSuccess();
              return;
            }

            var email = emails_to_add.shift();

            // extract the email type from the server response, if it
            // doesn't exist, assume secondary
            var type = emails[email].type || "secondary";
            persistEmail(email, type, addNextEmail, onFailure);
          }

          addNextEmail();
        }, onFailure);
      });
    },

    /**
     * Check whether the current user is authenticated.
     * @method checkAuthentication
     * @param {function} [onSuccess] - Called when check is complete with one
     * boolean parameter, authenticated.  authenticated will be true if user is
     * authenticated, false otw.
     * @param {function} [onFailure] - Called on error.
     */
    checkAuthentication: function(onSuccess, onFailure) {
      network.checkAuth(function(authenticated) {
        setAuthenticationStatus(authenticated);
        if (onSuccess) {
          onSuccess(authenticated);
        }
      }, onFailure);
    },

    /**
     * Check whether the current user is authenticated.  If authenticated, sync
     * identities.
     * @method checkAuthenticationAndSync
     * @param {function} [onSuccess] - Called if authentication check succeeds
     * but before sync starts.  Useful for displaying status messages about the
     * sync taking a moment.
     * @param {function} [onComplete] - Called on sync completion.
     * @param {function} [onFailure] - Called on error.
     */
    checkAuthenticationAndSync: function(onSuccess, onComplete, onFailure) {
      var self=this;
      network.checkAuth(function(authenticated) {
        setAuthenticationStatus(authenticated);
        if (authenticated) {
          if (onSuccess) {
            onSuccess(authenticated);
          }

          self.syncEmails(function() {
            if (onComplete) {
              onComplete(authenticated);
            }
          }, onFailure);
        }
        else {
          onComplete(authenticated);
        }
      }, onFailure);
    },

    /**
     * Authenticate the user with the given email and password.
     * @method authenticate
     * @param {string} email - Email address to authenticate.
     * @param {string} password - Password.
     * @param {function} [onComplete] - Called on sync completion.
     * @param {function} [onFailure] - Called on error.
     */
    authenticate: function(email, password, onComplete, onFailure) {
      var self=this;
      network.authenticate(email, password, function(authenticated) {
        setAuthenticationStatus(authenticated);
        if (onComplete) {
          onComplete(authenticated);
        }
      }, onFailure);
    },

    /**
     * Check whether the email is already registered.
     * @method emailRegistered
     * @param {string} email - Email address to check.
     * @param {function} [onSuccess] - Called with one boolean parameter when
     * complete.  Parameter is true if `email` is already registered, false
     * otw.
     * @param {function} [onFailure] - Called on XHR failure.
     */
    isEmailRegistered: function(email, onSuccess, onFailure) {
      network.emailRegistered(email, onSuccess, onFailure);
    },

    /**
     * Get information about an email address.  Who vouches for it?
     * (is it a primary or a secondary)
     * @method addressInfo
     * @param {string} email - Email address to check.
     * @param {function} [onSuccess] - Called with an object on success,
     *   containing these properties:
     *     type: <secondary|primary>
     *     known: boolean, present - present if type is secondary
     *     auth: string - url to send users for auth - present if type is primary
     *     prov: string - url to embed for silent provisioning - present if type is secondary
     * @param {function} [onFailure] - Called on XHR failure.
     */
    addressInfo: function(email, onSuccess, onFailure) {
      network.addressInfo(email, onSuccess, onFailure);
    },

    /**
     * Add an email address to an already created account.  Sends address and
     * keypair to the server, user then needs to verify account ownership. This
     * does not add the new email address/keypair to the local list of
     * valid identities.
     * @method addEmail
     * @param {string} email - Email address.
     * @param {function} [onSuccess] - Called on successful completion.
     * @param {function} [onFailure] - Called on error.
     */
    addEmail: function(email, onSuccess, onFailure) {
      var self = this;
      network.addSecondaryEmail(email, origin, function(added) {
        if (added) storage.setStagedOnBehalfOf(self.getHostname());

        // we no longer send the keypair, since we will certify it later.
        if (onSuccess) onSuccess(added);
      }, onFailure);
    },

    /**
     * Wait for the email registration to complete
     * @method waitForEmailValidation
     * @param {string} email - email address to check.
     * @param {function} [onSuccess] - Called to give status updates.
     * @param {function} [onFailure] - Called on error.
     */
    waitForEmailValidation: function(email, onSuccess, onFailure) {
      registrationPoll(network.checkEmailRegistration, email, onSuccess, onFailure);
    },

    /**
     * Cancel the waitForEmailValidation poll
     * @method cancelEmailValidation
     */
    cancelEmailValidation: function() {
      cancelRegistrationPoll();
    },

    /**
     * Verify a users email address given by the token
     * @method verifyEmail
     * @param {string} token
     * @param {function} [onSuccess] - Called on success.
     *   Called with an object with valid, email, and origin if valid, called
     *   with only valid otw.
     * @param {function} [onFailure] - Called on error.
     */
    verifyEmail: function(token, onSuccess, onFailure) {
      network.emailForVerificationToken(token, function (email) {
        var invalidInfo = { valid: false };
        if (email) {
          network.completeEmailRegistration(token, function (valid) {
            var info = valid ? {
              valid: valid,
              email: email,
              origin: storage.getStagedOnBehalfOf()
            } : invalidInfo;

            storage.setStagedOnBehalfOf("");

            if (onSuccess) onSuccess(info);
          }, onFailure);
        } else if (onSuccess) {
          onSuccess(invalidInfo);
        }
      }, onFailure);
    },

    /**
     * Remove an email address.
     * @method removeEmail
     * @param {string} email - Email address to remove.
     * @param {function} [onSuccess] - Called when complete.
     * @param {function} [onFailure] - Called on error.
     */
    removeEmail: function(email, onSuccess, onFailure) {
      if (storage.getEmail(email)) {
        network.removeEmail(email, function() {
          storage.removeEmail(email);
          if (onSuccess) {
            onSuccess();
          }
        }, onFailure);
      } else if (onSuccess) {
        onSuccess();
      }
    },

    /**
     * Sync an identity with the server.  Creates and stores locally and on the
     * server a keypair for the given email address.
     * @method syncEmailKeypair
     * @param {string} email - Email address.
     * @param {string} [issuer] - Issuer of keypair.
     * @param {function} [onComplete] - Called on completion.  Called with
     * status parameter - true if successful, false otw.
     * @param {function} [onFailure] - Called on error.
     */
    syncEmailKeypair: function(email, onComplete, onFailure) {
      prepareDeps();
      // FIXME: parameterize!
      var keysize = 256;
      var ie_version = BrowserID.BrowserSupport.getInternetExplorerVersion();
      if (ie_version > -1 && ie_version < 9)
        keysize = 128;
      var keypair = jwk.KeyPair.generate("DS", keysize);
      setTimeout(function() {
        certifyEmailKeypair(email, keypair, onComplete, onFailure);
      }, 0);
    },


    /**
     * Get an assertion for an identity
     * @method getAssertion
     * @param {string} email - Email to get assertion for.
     * @param {string} audience - Audience to use for the assertion.
     * @param {function} [onSuccess] - Called with assertion on success.
     * @param {function} [onFailure] - Called on error.
     */
    getAssertion: function(email, audience, onSuccess, onFailure) {
      // we use the current time from the browserid servers
      // to avoid issues with clock drift on user's machine.
      // (issue #329)
        var storedID = storage.getEmail(email),
            assertion,
            self=this;

        function createAssertion(idInfo) {
          network.serverTime(function(serverTime) {
            var sk = jwk.SecretKey.fromSimpleObject(idInfo.priv);

            // yield!
            setTimeout(function() {
              // assertions are valid for 2 minutes
              var expirationMS = serverTime.getTime() + (2 * 60 * 1000);
              var expirationDate = new Date(expirationMS);
              var tok = new jwt.JWT(null, expirationDate, audience);

              // yield!
              setTimeout(function() {
                assertion = vep.bundleCertsAndAssertion([idInfo.cert], tok.sign(sk), true);
                storage.site.set(audience, "email", email);
                if (onSuccess) {
                  onSuccess(assertion);
                }
              }, 0);
            }, 0);
          }, onFailure);
        }

        if (storedID) {
          prepareDeps();
          if (storedID.priv) {
            // parse the secret key
            // yield to the render thread!
            setTimeout(function() {
              createAssertion(storedID);
            }, 0);
          }
          else {
            // we have no key for this identity, go generate the key,
            // sync it and then get the assertion recursively.
            User.syncEmailKeypair(email, function() {
              User.getAssertion(email, audience, onSuccess, onFailure);
            }, onFailure);
          }
        }
        else if (onSuccess) {
          onSuccess();
        }
    },

    /**
     * Get the list of identities stored locally.
     * @method getStoredEmailKeypairs
     * @return {object} identities.
     */
    getStoredEmailKeypairs: function() {
      return storage.getEmails();
    },

    /**
     * Get an individual stored identity.
     * @method getStoredEmailKeypair
     * @return {object} identity information for email, if exists, undefined
     * otw.
     */
    getStoredEmailKeypair: function(email) {
      return storage.getEmail(email);
    },

    /**
     * Clear the list of identities stored locally.
     * @method clearStoredEmailKeypairs
     */
    clearStoredEmailKeypairs: function() {
      storage.clear();
    },

    /**
     * Get an assertion for the current domain, as long as the user has
     * selected that they want the email/site remembered
     * @method getPersistentSigninAssertion
     * @param {function} onComplete - called on completion.  Called with an
     * assertion if successful, null otw.
     * @param {function} onFailure - called on XHR failure.
     */
    getPersistentSigninAssertion: function(onComplete, onFailure) {
      var self=this;

      self.checkAuthentication(function(authenticated) {
        if (authenticated) {
          var remembered = storage.site.get(origin, "remember");
          var email = storage.site.get(origin, "email");
          if (remembered && email) {
            self.getAssertion(email, origin, onComplete, onFailure);
          }
          else if (onComplete) {
            onComplete(null);
          }
        }
        else if (onComplete) {
          onComplete(null);
        }
      }, onFailure);
    },

    /**
     * Clear the persistent signin field for the current origin
     * @method clearPersistentSignin
     * @param {function} onComplete - called on completion.  Called with
     * a boolean, true if successful, false otw.
     * @param {function} onFailure - called on XHR failure.
     */
    clearPersistentSignin: function(onComplete, onFailure) {
      var self=this;

      self.checkAuthentication(function(authenticated) {
        if (authenticated) {
          storage.site.set(origin, "remember", false);
          if (onComplete) {
            onComplete(true);
          }
        } else if (onComplete) {
          onComplete(false);
        }
      }, onFailure);
    }
  };

  User.setOrigin(document.location.host);
  return User;
}());
