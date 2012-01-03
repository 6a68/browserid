const
db = require('../db.js'),
wsapi = require('../wsapi.js'),
httputils = require('../httputils'),
logger = require('../logging.js').logger;

exports.method = 'post';
exports.writes_db = true;
exports.authed = false;
exports.args = ['token','pass'];

exports.process = function(req, res) {
  // issue #155, valid password length is between 8 and 80 chars.
  if (req.body.pass.length < 8 || req.body.pass.length > 80) {
    httputils.badRequest(res, "valid passwords are between 8 and 80 chars");
    return;
  }

  // at the time the email verification is performed, we'll clear the pendingCreation
  // data on the session.
  delete req.session.pendingCreation;

  // We should check to see if the verification secret is valid *before*
  // bcrypting the password (which is expensive), to prevent a possible
  // DoS attack.
  db.haveVerificationSecret(req.body.token, function(known) {
    if (!known) return res.json({ success: false} );

    // now bcrypt the password
    wsapi.bcryptPassword(req.body.pass, function (err, hash) {
      if (err) {
        logger.error("can't bcrypt: " + err);
        return res.json({ success: false });
      }

      db.gotVerificationSecret(req.body.token, hash, function(err, email) {
        if (err) {
          logger.warn("couldn't complete email verification: " + err);
          res.json({ success: false });
        } else {
          // FIXME: not sure if we want to do this (ba)
          // at this point the user has set a password associated with an email address
          // that they've verified.  We create an authenticated session.
          wsapi.setAuthenticatedUser(req.session, email);
          res.json({ success: true });
        }
      });
    });
  });
};
