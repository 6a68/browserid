#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pages.dialog import SignIn
from unittestzero import Assert

from pages.rps.onedone import OnedoneHomePage
from pages.complete_registration import CompleteRegistration
from utils.restmail import RestmailInbox
from utils.mock_user import MockUser

import pytest

class TestForgotPassword:
    def get_verified_user(self, mozwebqa):
      mozwebqa.base_url = "http://dev.123done.org"
      
      # Is there a way to open the dialog to the initial state 
      # without specifying 'returning' to home_pg.click_sign_in?
      home_pg = OnedoneHomePage(mozwebqa)
      user = MockUser()

      home_pg.go_to_home_page()
      bid_login = home_pg.click_sign_in()

      bid_login.sign_in_new_user(user.email, user.password)

      # Open restmail inbox, find the email
      inbox = RestmailInbox(user.email)
      email = inbox.find_by_index(0)

      # Load the BrowserID link from the email in the browser
      CompleteRegistration(mozwebqa.selenium, mozwebqa.timeout, email.verify_user_link)
      home_pg.logout()
      inbox.delete_all_mail()
      return user

    def open_dialog(self, mozwebqa):
      home_pg = OnedoneHomePage(mozwebqa)
      home_pg.go_to_home_page()
      dialog = home_pg.click_sign_in('returning')
      dialog.click_this_is_not_me()
      return dialog

    @pytest.mark.nondestructive
    def test_forgot_password(self, mozwebqa):
      # is it best to store mozwebqa in an initializer somewhere?
      user = self.get_verified_user(mozwebqa)
      dialog = self.open_dialog(mozwebqa)
      dialog.email = user.email
      dialog.click_next(expect='password')
      dialog.click_forgot_password()

      # at the forgot password screen, now reset the password
      dialog.password = "newpassword";
      dialog.verify_password = "newpassword";
      dialog.click_reset_password()

      # new password has been set, go check the verification email
      inbox = RestmailInbox(user.email)
      email = inbox.find_by_index(0)

      print "email: " + email.reset_password_link

      # Load the BrowserID link from the email in the browser
      #CompleteRegistration(mozwebqa.selenium, mozwebqa.timeout, email.reset_password_link)

        
