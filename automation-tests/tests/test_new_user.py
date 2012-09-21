#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pages.idps.eyedeeme import EyeDeeMe
from pages.rps.onedone import OnedoneHomePage
from pages.rps.myfavoritebeer import MfbHomePage
from pages.account_manager import AccountManager
from pages.complete_registration import CompleteRegistration
from pages.dialog import SignIn
from utils.restmail import RestmailInbox
from utils.mock_user import MockUser
from unittestzero import Assert

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


class TestNewAccount:

    def test_create_secondary_user_onedone(self, mozwebqa):
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

    def test_create_secondary_user_mfb(self, mozwebqa):
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

        inbox = RestmailInbox(user['email'])
        email = inbox.find_by_index(0)

        # todo: is seeing the 'thank you' screen enough? do we need to go back to mfb?
        complete_registration = CompleteRegistration(mozwebqa.selenium, mozwebqa.timeout, email.verify_user_link, 'success')


    def test_create_secondary_user_mfb_two_browsers(self, mozwebqa):
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
        second_browser = webdriver.Firefox()
        second_browser.get(email.verify_user_link)
        WebDriverWait(second_browser, mozwebqa.timeout).until(
            lambda s: s.find_element(By.ID, 'password').is_displayed())
        password_input = second_browser.find_element(By.ID, 'password')
        password_input.send_keys(user['password'])
        submit_btn = second_browser.find_element(By.TAG_NAME, 'button')
        submit_btn.click()
        WebDriverWait(second_browser, mozwebqa.timeout).until(
            lambda s: s.find_element_by_id('congrats').is_displayed())
        second_browser.close()


    def test_create_primary_user_onedone(self, mozwebqa):
        mozwebqa.base_url = 'http://dev.123done.org'
        parent_window = mozwebqa.selenium.current_window_handle

        user = MockUser('eyedee.me')
        home_pg = OnedoneHomePage(mozwebqa)

        home_pg.go_to_home_page()
        bid_login = home_pg.click_sign_in()
        bid_login.sign_in_primary(user['email'], user['password'])

        eyedee = EyeDeeMe(mozwebqa)
        eyedee.dialog_create_account(user['password'])

        mozwebqa.selenium.switch_to_window(parent_window)
        Assert.equal(home_pg.logged_in_user_email, user['email'])
