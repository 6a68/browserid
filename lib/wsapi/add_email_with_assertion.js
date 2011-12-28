const
db = require('../db.js'),
wsapi = require('../wsapi.js'),
httputils = require('../httputils'),
logger = require('../logging.js').logger,
querystring = require('querystring'),
primary = require('../primary.js'),
http = require('http'),
https = require('https');

exports.method = 'post';
exports.writes_db = true;
exports.authed = true;
exports.args = ['assertion'];

// This WSAPI will be invoked when a user attempts to add a primary
// email address to their browserid account.  They must already be
// authenticated.
exports.process = function(req, res) {
  // first let's verify that the assertion is valid
  primary.verifyAssertion(req.body.assertion, function(err, email) {
    if (err) {
      return res.json({
        success: false,
        reason: err.toString()
      });
    }

    // user is authenticated as req.session.authenticatedUser (an email address),
    // and they've proved, via assertion, that they own 'email'.  Let's add
    // that email to their account, removing it from others accounts if required.
    db.addPrimaryEmailToAccount(req.session.authenticatedUser, email, function(err) {
      if (err) {
        logger.warn('cannot add primary email "' + email + '" to acct with email "'
                    + req.session.authenticatedUser + '": ' + err);
        return res.json({
          success: false,
          reason: "database error"
        });
      }

      // success!
      logger.info('added email "' + email + '" to acct with email "'
                  + req.session.authenticatedUser + '"');
      return res.json({ success: true });
    });
  });
};
