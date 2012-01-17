/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const
config = require('../configuration'),
ca = require('./ca.js');

process.on('message', function(m) {
  try {
    // parse the pubkey
    var pk = ca.parsePublicKey(m.pubkey);

    // same account, we certify the key
    // we certify it for a day for now
    var expiration = new Date();
    expiration.setTime(new Date().valueOf() + config.get('certificate_validity_ms'));
    var cert = ca.certify(m.email, pk, expiration);
    process.send({"success": cert});
  } catch(e) {
    process.send({"error": e ? e.toString() : "unknown"});
  }
});
