#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pages.rps.myfavoritebeer import MfbHomePage
from pages.rps.onedone import OnedoneHomePage
from unittestzero import Assert

import pytest


class TestSignIn:

    def _sign_in(self, pom):
        pom.go_to_home_page()
        pom.sign_in()

    @pytest.mark.nondestructive
    def test_sign_in_observer_api(self, mozwebqa):
        onedone = OnedoneHomePage(mozwebqa)
        self._sign_in(onedone)
        Assert.true(onedone.is_logged_in)

    @pytest.mark.nondestructive
    def test_sign_in_get_api(self, mozwebqa):
        mfb = MfbHomePage(mozwebqa)
        self._sign_in(mfb)
        Assert.true(mfb.is_logged_in)
