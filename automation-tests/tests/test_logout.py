#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pages.rps.myfavoritebeer import MfbHomePage
from pages.rps.onedone import OnedoneHomePage
from unittestzero import Assert

import pytest


class TestLogout:

    def _sign_in_and_out(self, pom):
        pom.go_to_home_page()
        pom.sign_in()
        pom.logout()

    @pytest.mark.nondestructive
    @pytest.mark.onedone
    def test_logout_observer_api(self, mozwebqa):
        mozwebqa.base_url = 'http://beta.123done.org'
        onedone = OnedoneHomePage(mozwebqa)
        self._sign_in_and_out(onedone)
        Assert.false(onedone.is_logged_in)

    @pytest.mark.nondestructive
    @pytest.mark.mfb
    def test_logout_get_api(self, mozwebqa):
        mozwebqa.base_url = 'http://beta.myfavoritebeer.org'
        mfb = MfbHomePage(mozwebqa)
        self._sign_in_and_out(mfb)
        Assert.false(mfb.is_logged_in)
