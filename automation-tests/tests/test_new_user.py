#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pages.onedone import OnedoneHomePage
from pages.myfavoritebeer import MfbHomePage
from pages.dialog.account_manager import AccountManager
from pages.dialog.complete_registration import CompleteRegistration
from pages.dialog import SignIn
from utils.restmail import RestmailInbox
from utils.mock_user import MockUser
from unittestzero import Assert

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


class TestNewAccount:

    def disabled_test_create_secondary_user_onedone(self, mozwebqa):
        mozwebqa.base_url = 'http://dev.123done.org'
        user = MockUser()
        home_pg = OnedoneHomePage(mozwebqa)

        home_pg.go_to_home_page()
        bid_login = home_pg.click_sign_in()
        bid_login.sign_in_new_user(user['email'], user['password'])

        # Open restmail inbox, find the email
        inbox = RestmailInbox(user['email'])
        email = inbox.find_by_index(0)

        # Load the BrowserID link from the email in the browser
        complete_registration = CompleteRegistration(mozwebqa.selenium, mozwebqa.timeout, email.verify_user_link)

        Assert.equal(home_pg.logged_in_user_email, user['email'])

    def disabled_test_create_secondary_user_mfb(self, mozwebqa):
        mozwebqa.base_url = 'http://dev.myfavoritebeer.org'
        user = MockUser()
        mfb = MfbHomePage(mozwebqa)
        
        # this is, like, getting copied over directly from mfb. argh.
        # so, split out the startup third-party stuff from the dialog/site flows.
        # and make bidpom the dialog flows.
        mfb.go_to_home_page()
        mfb.click_sign_in()
        sign_in = SignIn(mozwebqa.selenium, mozwebqa.timeout, expect='new')
        user = MockUser()
        sign_in.sign_in_new_user(user['email'], user['password'])

        # Open restmail inbox, find the email
        inbox = RestmailInbox(user['email'])
        email = inbox.find_by_index(0)

        # Load the BrowserID link from the email in the browser
        complete_registration = CompleteRegistration(mozwebqa.selenium, mozwebqa.timeout, email.verify_user_link, 'redirect')

        # the old 'get' api, unlike 123done and the 'observer' api,
        # doesn't redirect to the third-party site automatically.
        # you have to confirm the account was created inside 
        # the account manager page--unless you want to go back to
        # mfb and verify it works there. meh.
        account_manager = AccountManager(mozwebqa.selenium, mozwebqa.timeout)
        Assert.contains(user['email'], account_manager.emails)

    def disabled_test_create_secondary_user_mfb_two_browsers(self, mozwebqa):
        from selenium import webdriver
        ff = webdriver.Firefox()

        mozwebqa.base_url = 'http://dev.myfavoritebeer.org'
        user = MockUser()
        mfb = MfbHomePage(mozwebqa)
        # this is, like, getting copied over directly from mfb. argh.
        # so, split out the startup third-party stuff from the dialog/site flows.
        # and make bidpom the dialog flows.
        mfb.go_to_home_page()
        mfb.click_sign_in()
        sign_in = SignIn(mozwebqa.selenium, mozwebqa.timeout, expect='new')
        user = MockUser()
        sign_in.sign_in_new_user(user['email'], user['password'])

        # Open restmail inbox, find the email
        inbox = RestmailInbox(user['email'])
        email = inbox.find_by_index(0)

        # Load the BrowserID link from the email in another browser
        # todo: move this stuff into CompleteRegistration, or a subclass that works in second browser
        ff.get(email.verify_user_link)
        WebDriverWait(ff, mozwebqa.timeout).until(
            lambda s: s.find_element(By.ID, 'password').is_displayed())
        password_input = ff.find_element(By.ID, 'password')
        password_input.send_keys(user['password'])
        submit_btn = ff.find_element(By.TAG_NAME, 'button')
        submit_btn.click()
        # wait for redirect. dunno how to do this. just sleep for the moment.
        import time
        time.sleep(8)
        # I think this should now worK:
        # but do we want to check that we're logged into mfb? or not?
        account_manager = AccountManager(ff, mozwebqa.timeout)
        Assert.contains(user['email'], account_manager.emails)
        ff.close()

    def test_create_primary_user_onedone(self, mozwebqa):
        mozwebqa.base_url = 'http://dev.123done.org'
        # borrowed from MockUser
        import time
        user = {}
        user['email'] = 'testuser_%s@eyedee.me' % repr(time.time())
        user['password'] = 'Password12345'
        home_pg = OnedoneHomePage(mozwebqa)

        home_pg.go_to_home_page()
        bid_login = home_pg.click_sign_in()
        #bid_login.sign_in_new_user(user['email'], user['password'])
        bid_login.email = user['email']
        mozwebqa.selenium.find_element(By.CSS_SELECTOR, 'button.start').click()
        # should see the dialog with a verifyWithPrimary button
        # is this the wrong selenium? python is fun.
        def button_is_ready(self, selenium, locator):
            btn = selenium.find_element_by_id(locator)
            return btn && btn.get_attribute('disabled') == null

        WebDriverWait(mozwebqa.selenium, mozwebqa.timeout).until(
            button_is_ready(mozwebqa.selenium, 'verifyWithPrimary'))
            # wait until it does not have a disabled attr
            lambda s: s.find_element(
            lambda s: 'disabled' != s.find_element(By.ID, 'verifyWithPrimary').get_attribute('disabled'))

        # I think the implicit timeout should work here
        mozwebqa.selenium.find_element(By.ID, 'verifyWithPrimary').click()

        # now we should see eyedee.me
        WebDriverWait(mozwebqa.selenium, mozwebqa.timeout).until(
            lambda s: s.title == 'EyeDee.Me - Easy to use email aliases')
        mozwebqa.selenium.find_element(By.ID, 'new_password').send_keys(user['password'])
        mozwebqa.selenium.find_element(By.ID, 'create_account').click()

        # the dialog says stuff, skipping for the moment
        home_pg.wait_for_user_login()
        Assert.equal(home_pg.logged_in_user_email, user['email'])
