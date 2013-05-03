/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// utility functions for wsapi modules

const config = require('./configuration');

/**
 * Get the millisecond duration value a session should have
 *
 * @param {object} req      - the http request object
 */
module.exports.getDurationMS = function getDurationMS(req) {
  var ephemeral = req.params.ephemeral;
  var ua_string = req.headers['user-agent'] || "";

  var duration_ms = ephemeral
                  ? config.get('ephemeral_session_duration_ms')
                  : config.get('authentication_duration_ms');

  // FirefoxOS wants sessions to last for 10 years for non-ephemeral
  // sessions.
  //
  // (Kittens die when you match user agent strings.  So if you 
  // like kittens, avert your eyes now.)
  //
  // Example ua: Mozilla/5.0 (Mobile; rv:18.0) Gecko/18.0 Firefox/18.0
  // Note: V8 compiles regexes automatically.
  if ((!ephemeral) && ua_string.match(/Mobile.*Firefox/)) {
    duration_ms = 315360000000; // 10 years
  }

  return duration_ms;
};
