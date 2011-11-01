/*globals BrowserID: true, _: true */
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

$(function() {
  "use strict";

  /**
   * For the main page
   */

  var bid = BrowserID,
      pageHelpers = bid.PageHelpers,
      user = bid.User,
      token = pageHelpers.getParameterByName("token"),
      path = document.location.pathname;

  if (!path || path === "/") {
    bid.index();
  }
  else if (path === "/signin") {
    bid.signIn();
  }
  else if (path === "/signup") {
    bid.signUp();
  }
  else if (path === "/forgot") {
    bid.forgot();
  }
  else if (token && path === "/add_email_address") {
    bid.addEmailAddress(token);
  }
  else if(token && path === "/verify_email_address") {
    bid.verifyEmailAddress(token);
  }

  if ($('#vAlign').length) {
    $(window).bind('resize', function() { $('#vAlign').css({'height' : $(window).height() }); }).trigger('resize');
  }

  $(".signOut").click(function(event) {
    event.preventDefault();

    user.logoutUser(function() {
      document.location = "/";
    });
  });

  $(".display_always,.display_auth,.display_nonauth").hide();

  var ANIMATION_TIME = 500;
  user.checkAuthentication(function(authenticated) {
    $(".display_always").fadeIn(ANIMATION_TIME);

    if (authenticated) {
      $(".display_auth").fadeIn(ANIMATION_TIME);
      if ($('#emailList').length) {
        bid.manageAccount();
      }
    }
    else {
      $(".display_nonauth").fadeIn(ANIMATION_TIME);
    }
  });


});

