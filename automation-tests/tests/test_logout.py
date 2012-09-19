#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from pages.onedone import OnedoneHomePage
from pages.myfavoritebeer import MfbHomePage
from unittestzero import Assert

import pytest


class TestLogout:

    @pytest.mark.nondestructive
    def test_user_can_logout_observer_api(self, mozwebqa):
        home_pg = OnedoneHomePage(mozwebqa)
        home_pg.go_to_home_page()
        home_pg.sign_in()

        home_pg.logout()
        Assert.false(home_pg.is_logged_in)

    @pytest.mark.nondestructive
    def test_user_can_logout_get_api(self, mozwebqa):
        home_pg = MfbHomePage(mozwebqa)
        home_pg.go_to_home_page()
        home_pg.sign_in()
        home_pg.logout()
        Assert.false(home_pg.is_logged_in)
