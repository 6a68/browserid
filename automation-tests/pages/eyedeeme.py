#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from page import Page


class MfbHomePage(Page):

    def __init__(self, testsetup):
        self.testsetup = testsetup
        self.selenium = testsetup.selenium
        self.timeout = testsetup.timeout

    
