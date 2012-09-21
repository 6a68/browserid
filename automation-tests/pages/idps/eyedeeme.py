#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from ..page import Page


# this is actually the dialog, not the main site.
class EyeDeeMe(Page):

    _page_title = 'EyeDee.Me - Easy to use email aliases'

    _new_password_locator = (By.ID, 'new_password')
    _create_account_btn_locator = (By.ID, 'create_account')

    def __init__(self, testsetup):
        self.testsetup = testsetup
        self.selenium = testsetup.selenium
        self.timeout = testsetup.timeout

    @property
    def new_password(self):
        return self.selenium.find_element(*self._new_password_locator).get_attribute('value')

    @new_password.setter
    def new_password(self, value):
        password = self.selenium.find_element(*self._new_password_locator)
        password.clear()
        password.send_keys(value)

    def click_create_account(self):
        self.selenium.find_element(*self._create_account_btn_locator).click()

    def dialog_create_account(self, password):
        self.new_password = password
        WebDriverWait(self.selenium, self.timeout).until(
            lambda s: s.find_element(
                *self._create_account_btn_locator).is_displayed())
        self.click_create_account()
