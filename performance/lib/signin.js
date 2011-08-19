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
 *   Lloyd Hilaiel <lloyd@hilaiel.com> 
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

/* this file is the "signin" activity, which simulates the process of a user
 * who has used browserid before signing into browserid inside the dialog and
 * picking an idenity */

exports.startFunc = function(cfg, cb) {
  // A new user signing up for browserid looks like this in terms of
  // network transactions:
  //
  // 1. RP includes include.js 
  // 2. users' browser loads all code associated with dialog
  // 3. in page javascript calls CSRF to get a CSRF token
  // 4. /wsapi/authenticate_user is called once the user enters credentials
  // 5. /wsapi/sync_emails is called from the client to get a list of all emails
  //    that are verified for the user
  // 6. /wsapi/set_key is called once per email from the client to inform the server
  //    of the user's public keys (XXX: this should be lazy and only do the email that
  //    the user is using, further this will change once we move to certificates
  // 7. the RP will call /verify to verify a generated assertion
  
  // XXX: write me

  setTimeout(function() { cb(true); }, 10); 
};
